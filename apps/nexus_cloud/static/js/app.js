/**
 * Main Application Orchestrator for Grogu Cloud Studio.
 * 
 * Manages reactive UI state, coordinates ViewContext synchronization,
 * HUD updates, and event listeners.
 */

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


// Application Core Initializer
class App {
  constructor() {
    this.store = new AppStore();
    this.viewContextMgr = new ViewContextManager();
    this.dispatcher = new ActionDispatcher(this.store);
    this.ws = new WSClient('/ws/copilot');
    this.audio = new AudioController(this.ws);
  }

  init() {
    console.log('[App] Initializing Grogu Voice AI Copilot Platform...');

    // 1. Initial State Render
    this.store.render();
    this.audio.drawIdleWaveform();

    // 2. Wire up UI Controls
    this.bindEvents();

    // 3. Setup WebSocket Callbacks
    this.setupWebSocket();

    // 4. Connect WebSocket
    this.ws.connect();
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

    // Mic Button
    document.getElementById('mic_btn')?.addEventListener('click', () => {
      this.audio.toggleRecording();
    });

    // Simulated Prompt Chip Buttons
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-command');
        if (cmd) {
          this.audio.simulateVoiceCommand(cmd);
        }
      });
    });

    // Manual Text Prompt Fallback Form
    document.getElementById('text_prompt_form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('text_prompt_input');
      const text = input?.value.trim();
      if (text) {
        this.submitTextPrompt(text);
        input.value = '';
      }
    });

    // Sync ViewContext whenever state changes
    this.store.onStateChange(() => {
      this.syncViewContext();
    });
  }

  setupWebSocket() {
    this.ws.on('open', () => {
      this.syncViewContext();
    });

    this.ws.on('TRANSCRIPTION', (msg) => {
      const el = document.getElementById('stt_transcript_text');
      const tag = document.getElementById('stt_status_tag');
      if (el) el.textContent = `"${msg.text}"`;
      if (tag) tag.textContent = msg.is_final ? 'Finalized' : 'Recognizing...';
    });

    this.ws.on('AGENT_THINKING', (msg) => {
      const el = document.getElementById('agent_thought_text');
      if (el && msg.text) el.innerHTML = `<em>${msg.text}</em>`;
    });

    this.ws.on('AGENT_RESPONSE', (msg) => {
      const resp = msg.agent_response;
      if (!resp) return;

      // Update Reasoning Box
      const thoughtEl = document.getElementById('agent_thought_text');
      if (thoughtEl) thoughtEl.textContent = resp.thought;

      // Update Spoken Speech Box & Vocalize Natural Human Voice
      const speechCont = document.getElementById('speech_output_container');
      const speechText = document.getElementById('speech_output_text');
      if (speechCont && speechText) {
        speechCont.style.display = 'block';
        speechText.textContent = resp.speech_output;
      }
      if (resp.speech_output) {
        this.audio.speakNaturalVoice(resp.speech_output);
      }

      // Dispatch UIActions
      if (resp.actions && resp.actions.length > 0) {
        resp.actions.forEach(action => {
          this.dispatcher.dispatch(action);
        });

        // Send ACK back to server
        this.ws.send({
          type: 'ACTION_ACK',
          data: { executed_count: resp.actions.length, status: 'success' }
        });
      }
    });

    this.ws.on('AUDIO_RESPONSE', (msg) => {
      if (msg.audio_base64) {
        this.audio.playAudioResponse(msg.audio_base64);
      }
    });

    this.ws.on('ERROR', (msg) => {
      console.error('[App] Server error received:', msg.error);
      this.store.showToast(`⚠️ Error: ${msg.error}`);
    });
  }

  syncViewContext() {
    const snapshot = this.viewContextMgr.generateSnapshot(this.store);
    
    // Update live inspector viewer
    const viewer = document.getElementById('view_context_viewer');
    if (viewer) {
      viewer.textContent = JSON.stringify(snapshot, null, 2);
    }

    // Transmit ViewContext over WebSocket to MCP connector
    if (this.ws.isConnected) {
      this.ws.send({
        type: 'VIEW_CONTEXT_UPDATE',
        view_context: snapshot
      });
    }
  }

  submitTextPrompt(text) {
    console.log('[App] Submitting text prompt:', text);
    const transcriptEl = document.getElementById('stt_transcript_text');
    if (transcriptEl) transcriptEl.textContent = `"${text}" (via text input)`;

    this.ws.send({
      type: 'TEXT_PROMPT',
      text: text
    });
  }
}

// Instantiate global app instance on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
