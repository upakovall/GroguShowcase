/**
 * Main Application Orchestrator for Nexus Cloud Studio.
 * 
 * Manages reactive UI state, coordinates ViewContext synchronization,
 * HUD updates, and continuous conversational voice interactions using
 * the decoupled VoiceCopilotClient SDK with client-side VAD.
 */

import { VoiceCopilotClient, CopilotVoiceState } from '/sdk/voice_copilot_client.js?v=2.0.1';

class AppStore {
  constructor() {
    this.theme = 'dark';
    this.region = 'us-east-1';
    this.workerNodes = 8;
    this.autoscaling = true;
    this.statusFilter = 'all'; // 'all', 'active', 'unhealthy'
    this.isDeployModalOpen = false;
    this.focusedElementId = null;

    // Seed mock server cluster data
    this.servers = [
      { id: 'node-us-01', role: 'API Gateway', region: 'us-east-1', status: 'active', cpu: '24%', memory: '3.8 GB' },
      { id: 'node-us-02', role: 'Inference Worker', region: 'us-east-1', status: 'active', cpu: '78%', memory: '11.2 GB' },
      { id: 'node-us-03', role: 'Database Replica', region: 'us-east-1', status: 'active', cpu: '42%', memory: '6.4 GB' },
      { id: 'node-us-04', role: 'Background Queue', region: 'us-east-1', status: 'unhealthy', cpu: '98%', memory: '7.9 GB' },
      { id: 'node-eu-01', role: 'Edge Router', region: 'eu-central-1', status: 'active', cpu: '18%', memory: '2.1 GB' },
      { id: 'node-eu-02', role: 'Inference Worker', region: 'eu-central-1', status: 'active', cpu: '65%', memory: '9.8 GB' },
      { id: 'node-eu-03', role: 'Cache Cluster', region: 'eu-central-1', status: 'unhealthy', cpu: '88%', memory: '5.6 GB' },
      { id: 'node-ap-01', role: 'API Gateway', region: 'ap-northeast-1', status: 'active', cpu: '31%', memory: '4.0 GB' },
    ];

    this.onStateChangeCallbacks = [];
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  notifyStateChange() {
    this.render();
    this.onStateChangeCallbacks.forEach(cb => cb(this));
  }

  getVisibleServers() {
    return this.servers.filter(s => {
      if (this.statusFilter === 'active') return s.status === 'active';
      if (this.statusFilter === 'unhealthy') return s.status === 'unhealthy';
      return true;
    });
  }

  setTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
    const icon = document.getElementById('theme_icon');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    this.notifyStateChange();
  }

  setRegion(region) {
    this.region = region;
    const select = document.getElementById('region_select');
    if (select) select.value = region;
    this.notifyStateChange();
  }

  setWorkerNodes(count) {
    this.workerNodes = Math.max(1, Math.min(32, count));
    const input = document.getElementById('worker_nodes_input');
    if (input) input.value = this.workerNodes;
    
    const stat = document.getElementById('stat_active_nodes');
    if (stat) stat.innerHTML = `${this.workerNodes} <span class="stat-sub">/ 12 max</span>`;
    this.notifyStateChange();
  }

  setAutoscaling(enabled) {
    this.autoscaling = enabled;
    const toggle = document.getElementById('autoscaling_switch');
    if (toggle) toggle.checked = enabled;
    
    const stat = document.getElementById('stat_autoscale_val');
    if (stat) stat.textContent = enabled ? 'Enabled' : 'Disabled';
    this.notifyStateChange();
  }

  setStatusFilter(filter) {
    this.statusFilter = filter;
    const select = document.getElementById('filter_status');
    if (select) select.value = filter;
    
    const indicator = document.getElementById('active_filter_indicator');
    if (indicator) indicator.textContent = `Showing: ${filter.toUpperCase()}`;
    this.notifyStateChange();
  }

  setDeployModal(isOpen) {
    this.isDeployModalOpen = isOpen;
    const modal = document.getElementById('deploy_modal');
    if (modal) {
      modal.style.display = isOpen ? 'flex' : 'none';
      modal.setAttribute('aria-hidden', !isOpen);
    }
    this.notifyStateChange();
  }

  resetFilters() {
    this.statusFilter = 'all';
    this.region = 'us-east-1';
    this.setRegion('us-east-1');
    this.setStatusFilter('all');
    this.showToast('All view filters reset to default.');
  }

  showToast(message) {
    const container = document.getElementById('toast_container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `💬 ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  render() {
    const tbody = document.getElementById('server_tbody');
    const badge = document.getElementById('instance_count_badge');
    if (!tbody) return;

    const visible = this.getVisibleServers();
    if (badge) badge.textContent = `${visible.length} Instances`;

    if (visible.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">
            No server instances match the active filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = visible.map(s => `
      <tr>
        <td style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary);">${s.id}</td>
        <td>${s.role}</td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">${s.region}</td>
        <td>
          <span class="status-badge ${s.status}">
            <span class="dot ${s.status === 'active' ? 'dot-green' : 'dot-red'}"></span>
            ${s.status.toUpperCase()}
          </span>
        </td>
        <td style="font-family: var(--font-mono);">${s.cpu}</td>
        <td style="font-family: var(--font-mono);">${s.memory}</td>
        <td>
          <button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" onclick="app.store.showToast('Inspecting ${s.id} telemetry...')">
            Inspect
          </button>
        </td>
      </tr>
    `).join('');
  }
}


// Application Core Orchestrator
class App {
  constructor() {
    this.store = new AppStore();
    this.viewContextMgr = new ViewContextManager();
    this.dispatcher = new ActionDispatcher(this.store);

    // Waveform rendering members
    this.canvas = document.getElementById('waveform_canvas');
    this.canvasCtx = this.canvas ? this.canvas.getContext('2d') : null;
    this.currentVoiceState = CopilotVoiceState.IDLE;
    this.currentRms = 0;
    this.wavePhase = 0;

    // Initialize decoupled SDK client with Client-Side VAD
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.copilot = new VoiceCopilotClient({
      wsUrl: `${proto}//${window.location.host}/ws/copilot`,
      continuousMode: true,
      silenceThreshold: 0.015,
      silenceTimeoutMs: 1500,
      onStateChange: (state) => {
        this.updateWsBadge(state);
      },
      onVoiceStateChange: (newState, oldState) => {
        console.log(`[Nexus] VAD Voice State changed: ${oldState} -> ${newState}`);
        this.updateVoiceStateUI(newState);
      },
      onVolumeLevel: (rms) => {
        this.currentRms = rms;
      },
      onTranscription: (text, isFinal) => {
        if (isFinal && text) {
          this.appendChatMessage('user', text);
        }
      },
      onAgentThinking: (text) => {
        const label = document.getElementById('voice_status_label');
        if (label && text) label.textContent = text;
      },
      onAgentResponse: (resp) => {
        this.appendChatMessage('assistant', resp.speech_output || 'Command processed.', resp.thought, resp.actions);
      },
      onUIAction: (action) => {
        this.dispatcher.dispatch(action);
        this.syncViewContext();
      },
      onError: (err) => {
        console.error('[Nexus] Voice Copilot error:', err);
        this.store.showToast(`⚠️ Error: ${err.message || err}`);
      }
    });
  }

  init() {
    console.log('[App] Initializing Nexus Cloud Studio with Continuous Voice Copilot...');

    // 1. Initial State Render
    this.store.render();
    this.startWaveformVisualizer();

    // 2. Wire up UI Controls
    this.bindEvents();

    // 3. Connect SDK WebSocket
    this.copilot.connect();
    setTimeout(() => this.syncViewContext(), 500);
  }

  bindEvents() {
    // Theme Toggle
    document.getElementById('theme_toggle')?.addEventListener('click', () => {
      this.store.setTheme(this.store.theme === 'dark' ? 'light' : 'dark');
    });

    // Region Select
    document.getElementById('region_select')?.addEventListener('change', (e) => {
      this.store.setRegion(e.target.value);
    });

    // Worker Nodes Input
    document.getElementById('worker_nodes_input')?.addEventListener('change', (e) => {
      this.store.setWorkerNodes(parseInt(e.target.value, 10));
    });

    // Status Filter
    document.getElementById('filter_status')?.addEventListener('change', (e) => {
      this.store.setStatusFilter(e.target.value);
    });

    // Autoscaling Switch
    document.getElementById('autoscaling_switch')?.addEventListener('change', (e) => {
      this.store.setAutoscaling(e.target.checked);
    });

    // Deploy Modal Buttons
    document.getElementById('deploy_modal_btn')?.addEventListener('click', () => {
      this.store.setDeployModal(true);
    });
    document.getElementById('modal_close_btn')?.addEventListener('click', () => {
      this.store.setDeployModal(false);
    });
    document.getElementById('modal_cancel_btn')?.addEventListener('click', () => {
      this.store.setDeployModal(false);
    });
    document.getElementById('modal_confirm_btn')?.addEventListener('click', () => {
      this.store.setDeployModal(false);
      this.store.showToast('🚀 Preset deployment initiated across active cluster!');
    });

    // Reset Filters Button
    document.getElementById('reset_filters_btn')?.addEventListener('click', () => {
      this.store.resetFilters();
    });

    // Microphone Toggle Button (Starts / Stops Continuous Voice Session)
    document.getElementById('mic_btn')?.addEventListener('click', async () => {
      if (this.copilot.isRecording) {
        this.copilot.stopListening();
      } else {
        try {
          await this.copilot.startListening();
        } catch (err) {
          console.error('[Nexus] Error starting audio session:', err);
        }
      }
    });

    // Simulated Prompt Chip Buttons
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-command');
        if (cmd) {
          this.appendChatMessage('user', cmd);
          this.copilot.sendTextPrompt(cmd);
        }
      });
    });

    // Manual Text Prompt Fallback Form
    document.getElementById('text_prompt_form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('text_prompt_input');
      const text = input?.value.trim();
      if (text) {
        this.appendChatMessage('user', text);
        this.copilot.sendTextPrompt(text);
        input.value = '';
      }
    });

    // Sync ViewContext whenever state changes
    this.store.onStateChange(() => {
      this.syncViewContext();
    });
  }

  updateWsBadge(state) {
    const dot = document.getElementById('ws_dot');
    const text = document.getElementById('ws_status_text');
    if (!dot || !text) return;

    if (state === 'connected') {
      dot.className = 'dot dot-green pulse-green';
      text.textContent = 'WS 16kHz Connected';
    } else if (state === 'connecting') {
      dot.className = 'dot dot-amber';
      text.textContent = 'Connecting...';
    } else {
      dot.className = 'dot dot-red';
      text.textContent = 'Disconnected';
    }
  }

  updateVoiceStateUI(newState) {
    this.currentVoiceState = newState;
    const micBtn = document.getElementById('mic_btn');
    const badge = document.getElementById('voice_state_badge');
    const label = document.getElementById('voice_status_label');

    if (!micBtn) return;

    // Reset modifier classes
    micBtn.classList.remove('state-listening-silent', 'state-listening-speaking', 'state-processing', 'state-speaking', 'recording');

    switch (newState) {
      case CopilotVoiceState.LISTENING_SILENT:
        micBtn.classList.add('state-listening-silent');
        if (badge) {
          badge.className = 'state-badge badge-listening';
          badge.textContent = '🟢 LISTENING';
        }
        if (label) label.textContent = '🟢 Continuous Voice active: Listening... (Speak naturally)';
        break;

      case CopilotVoiceState.LISTENING_SPEAKING:
        micBtn.classList.add('state-listening-speaking', 'recording');
        if (badge) {
          badge.className = 'state-badge badge-speaking-user';
          badge.textContent = '🔴 STREAMING PCM';
        }
        if (label) label.textContent = '🎙️ Voice detected: Streaming 16kHz PCM chunks...';
        break;

      case CopilotVoiceState.PROCESSING:
        micBtn.classList.add('state-processing');
        if (badge) {
          badge.className = 'state-badge badge-processing';
          badge.textContent = '🟡 PROCESSING';
        }
        if (label) label.textContent = '⚡ Transcribing voice & reasoning over cluster state...';
        break;

      case CopilotVoiceState.SPEAKING:
        micBtn.classList.add('state-speaking');
        if (badge) {
          badge.className = 'state-badge badge-speaking-ai';
          badge.textContent = '🟣 AI SPEAKING';
        }
        if (label) label.textContent = '🔊 AI Copilot is vocalizing response...';
        break;

      case CopilotVoiceState.IDLE:
      default:
        if (badge) {
          badge.className = 'state-badge badge-idle';
          badge.textContent = '⚪ IDLE';
        }
        if (label) label.textContent = 'Tap microphone to start continuous voice conversation';
        break;
    }
  }

  startWaveformVisualizer() {
    if (!this.canvasCtx || !this.canvas) return;

    const draw = () => {
      requestAnimationFrame(draw);

      this.canvasCtx.fillStyle = 'rgba(17, 22, 34, 0.45)';
      this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      const width = this.canvas.width;
      const height = this.canvas.height;
      const mid = height / 2;

      this.canvasCtx.beginPath();
      this.canvasCtx.lineWidth = 2.2;

      if (this.currentVoiceState === CopilotVoiceState.IDLE) {
        // Flat baseline
        this.canvasCtx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
        this.canvasCtx.moveTo(0, mid);
        this.canvasCtx.lineTo(width, mid);
        this.canvasCtx.stroke();
        return;
      }

      if (this.currentVoiceState === CopilotVoiceState.LISTENING_SILENT) {
        // Subtle breathing sine wave
        this.canvasCtx.strokeStyle = '#06b6d4';
        this.wavePhase += 0.05;
        for (let x = 0; x < width; x++) {
          const y = mid + Math.sin(x * 0.04 + this.wavePhase) * 4;
          if (x === 0) this.canvasCtx.moveTo(x, y);
          else this.canvasCtx.lineTo(x, y);
        }
        this.canvasCtx.stroke();
        return;
      }

      if (this.currentVoiceState === CopilotVoiceState.LISTENING_SPEAKING) {
        // Dynamic RMS-scaled voice wave
        this.canvasCtx.strokeStyle = '#f43f5e';
        this.wavePhase += 0.24;
        const amp = Math.max(6, Math.min(16, this.currentRms * 180));
        for (let x = 0; x < width; x++) {
          const y = mid + Math.sin(x * 0.08 + this.wavePhase) * amp * Math.sin(x * 0.02);
          if (x === 0) this.canvasCtx.moveTo(x, y);
          else this.canvasCtx.lineTo(x, y);
        }
        this.canvasCtx.stroke();
        return;
      }

      if (this.currentVoiceState === CopilotVoiceState.PROCESSING) {
        // Amber scanning wave
        this.canvasCtx.strokeStyle = '#f59e0b';
        this.wavePhase += 0.12;
        for (let x = 0; x < width; x++) {
          const y = mid + Math.sin(x * 0.06 + this.wavePhase) * 5;
          if (x === 0) this.canvasCtx.moveTo(x, y);
          else this.canvasCtx.lineTo(x, y);
        }
        this.canvasCtx.stroke();
        return;
      }

      if (this.currentVoiceState === CopilotVoiceState.SPEAKING) {
        // Violet AI speech wave
        this.canvasCtx.strokeStyle = '#a855f7';
        this.wavePhase += 0.18;
        for (let x = 0; x < width; x++) {
          const y = mid + Math.sin(x * 0.07 + this.wavePhase) * 8 * Math.cos(x * 0.03);
          if (x === 0) this.canvasCtx.moveTo(x, y);
          else this.canvasCtx.lineTo(x, y);
        }
        this.canvasCtx.stroke();
      }
    };

    draw();
  }

  appendChatMessage(role, text, thought = null, actions = []) {
    const feed = document.getElementById('chat_stream_messages');
    if (!feed) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-stream-msg ${role}`;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const sender = role === 'user' ? '👤 You' : '✨ Grogu AI Copilot';

    let actionsHtml = '';
    if (actions && actions.length > 0) {
      actionsHtml = '<div class="chat-action-pills">' + actions.map(a => `<span class="chat-action-pill">⚡ ${a.action_type}: ${a.description}</span>`).join('') + '</div>';
    }

    let thoughtHtml = '';
    if (thought) {
      thoughtHtml = `<details class="chat-thought-accordion"><summary>🧠 Reasoning Thought Process</summary><p style="margin-top:0.3rem; font-family:var(--font-mono);">${thought}</p></details>`;
    }

    const bubbleClass = role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai';

    msgDiv.innerHTML = `
      <div class="chat-msg-header">${sender} <small style="opacity:0.6;">${timeStr}</small></div>
      <div class="${bubbleClass}">
        <div>${text}</div>
        ${thoughtHtml}
        ${actionsHtml}
      </div>
    `;

    feed.appendChild(msgDiv);
    feed.scrollTop = feed.scrollHeight;
  }

  syncViewContext() {
    const snapshot = this.viewContextMgr.generateSnapshot(this.store);
    
    // Update live inspector viewer
    const viewer = document.getElementById('view_context_viewer');
    if (viewer) {
      viewer.textContent = JSON.stringify(snapshot, null, 2);
    }

    // Transmit ViewContext over WebSocket to MCP connector
    this.copilot.syncViewContext(snapshot);
  }
}

// Instantiate global app instance on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
