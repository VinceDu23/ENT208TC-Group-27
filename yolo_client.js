/* ============================================
   yolo_client.js — WebSocket Client for YOLO Pose Server
   ============================================ */

class YoloPoseClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.serverUrl = 'ws://localhost:8765/ws';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.jointAngles = {};
    this.barPosition = { x: 0.5, y: 0.85 };
    this.keypoints = {};
    this.fps = 0;
    this.lastUpdateTime = 0;
    this.onAnglesUpdate = null;
    this.onBarPositionUpdate = null;
    this.onStatusChange = null;
    this.onKeypointsUpdate = null;
  }

  setServerUrl(url) { this.serverUrl = url; }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.ws) { try { this.ws.close(); } catch (e) {} }
      try { this.ws = new WebSocket(this.serverUrl); }
      catch (e) { this._notifyStatus('error', 'Invalid URL'); reject(e); return; }

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this._notifyStatus('ready', 'Connected to YOLO server');
        resolve(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'server_info') {
            this._notifyStatus('ready', msg.model);
            return;
          }
          if (msg.type === 'pose_data') {
            this.lastUpdateTime = Date.now() / 1000;
            if (msg.angles) { this.jointAngles = msg.angles; if (this.onAnglesUpdate) this.onAnglesUpdate(msg.angles); }
            if (msg.bar_position) { this.barPosition = msg.bar_position; if (this.onBarPositionUpdate) this.onBarPositionUpdate(msg.bar_position); }
            if (msg.keypoints) { this.keypoints = msg.keypoints; if (this.onKeypointsUpdate) this.onKeypointsUpdate(msg.keypoints); }
            if (msg.fps !== undefined) this.fps = msg.fps;
          }
        } catch (e) {}
      };

      this.ws.onerror = () => this._notifyStatus('error', 'WebSocket error');
      this.ws.onclose = (ev) => {
        this.connected = false;
        this._notifyStatus('disconnected', `Closed (${ev.code})`);
        this._attemptReconnect();
      };

      setTimeout(() => { if (!this.connected) reject(new Error('Timeout')); }, 5000);
    });
  }

  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._notifyStatus('error', 'Max reconnects reached');
      return;
    }
    this.reconnectAttempts++;
    this._notifyStatus('connecting', `Reconnecting ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    setTimeout(() => this.connect().catch(() => {}), this.reconnectDelay);
  }

  _notifyStatus(status, msg) {
    if (this.onStatusChange) this.onStatusChange({ status, message: msg || '', serverUrl: this.serverUrl });
  }

  async disconnect() {
    this.maxReconnectAttempts = 0;
    if (this.ws) { this.ws.close(1000, 'Client disconnect'); this.ws = null; }
    this.connected = false;
    this._notifyStatus('disconnected', 'Disconnected');
  }

  ping() { if (this.ws && this.connected) this.ws.send(JSON.stringify({ type: 'ping' })); }
  isConnected() { return this.connected; }
  getAngles() { return this.jointAngles; }
  getBarPosition() { return this.barPosition; }

  static async checkServer(url) {
    const httpUrl = url.replace('ws://', 'http://').replace('/ws', '/api/status');
    try {
      const resp = await fetch(httpUrl, { signal: AbortSignal.timeout(3000) });
      return await resp.json();
    } catch (e) { return null; }
  }
}
