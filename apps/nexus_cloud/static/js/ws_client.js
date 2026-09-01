/**
 * WebSocket Streaming Client for Voice AI Copilot.
 * 
 * Handles bi-directional JSON messaging and binary PCM audio streaming with
 * automated reconnection and event dispatching.
 */

class WSClient {
  constructor(endpoint = '/ws/copilot') {
    this.endpoint = endpoint;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.listeners = {};
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${this.endpoint}`;
    console.log(`[WSClient] Connecting to ${wsUrl}...`);

    this.updateStatusBadge('connecting');

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[WSClient] Connected successfully.');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateStatusBadge('connected');
        this.emit('open');
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const message = JSON.parse(event.data);
            this.handleServerMessage(message);
          } catch (err) {
            console.error('[WSClient] Failed to parse JSON message:', err);
          }
        }
      };

      this.ws.onclose = () => {
        console.warn('[WSClient] Connection closed.');
        this.isConnected = false;
        this.updateStatusBadge('disconnected');
        this.emit('close');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[WSClient] WebSocket error:', err);
        this.updateStatusBadge('disconnected');
      };

    } catch (err) {
      console.error('[WSClient] Init connection error:', err);
      this.scheduleReconnect();
    }
  }

  handleServerMessage(msg) {
    console.log(`[WSClient] Received: ${msg.type}`, msg);
    this.emit('message', msg);
    this.emit(msg.type, msg);
  }

  send(payload) {
    if (!this.isConnected || !this.ws) {
      console.warn('[WSClient] Cannot send, socket not connected.');
      return;
    }
    this.ws.send(JSON.stringify(payload));
  }

  sendBinary(arrayBuffer) {
    if (!this.isConnected || !this.ws) {
      console.warn('[WSClient] Cannot send binary, socket not connected.');
      return;
    }
    this.ws.send(arrayBuffer);
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WSClient] Max reconnect attempts reached.');
      return;
    }
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    console.log(`[WSClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => this.connect(), delay);
  }

  updateStatusBadge(status) {
    const badge = document.getElementById('ws_status_badge');
    const dot = document.getElementById('ws_dot');
    const text = document.getElementById('ws_status_text');
    if (!badge || !dot || !text) return;

    if (status === 'connected') {
      dot.className = 'dot dot-green pulse-green';
      text.textContent = 'WS 16kHz Connected';
    } else if (status === 'connecting') {
      dot.className = 'dot dot-amber';
      text.textContent = 'Connecting...';
    } else {
      dot.className = 'dot dot-red';
      text.textContent = 'Disconnected';
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

// Global export
window.WSClient = WSClient;
