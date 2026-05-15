/* ============================================
   bluetooth.js - Web Bluetooth BLE Manager
   Connects to Nano 33 BLE / ESP32 for:
   - Heart Rate (uint8 via Notify)
   - IMU Accelerometer (int16 x3 via Notify)
   ============================================ */

const BLE_CONFIG = {
  serviceUUID: '19b10000-e8f2-537e-4f6c-d104768a1214',
  characteristics: {
    heartRate: '19b10001-e8f2-537e-4f6c-d104768a1214',
    accelerometer: '19b10002-e8f2-537e-4f6c-d104768a1214',
    deviceStatus: '19b10003-e8f2-537e-4f6c-d104768a1214'
  },
  standardHR: {
    serviceUUID: '0000180d-0000-1000-8000-00805f9b34fb',
    measurementCharUUID: '00002a37-0000-1000-8000-00805f9b34fb'
  }
};

class BluetoothManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.connected = false;
    this.heartRate = 0;
    this.heartRateHistory = [];
    this.accelX = 0; this.accelY = 0; this.accelZ = 0;
    this.accelHistory = [];
    this.velocity = 0;
    this.lastAccelTime = 0;
    this.deviceName = '';
    this.onHRUpdate = null;
    this.onAccelUpdate = null;
    this.onStatusChange = null;
    this.customUUIDs = { ...BLE_CONFIG };
  }

  isWebBluetoothSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  setUUIDs(uuids) {
    this.customUUIDs = { ...BLE_CONFIG, ...uuids };
  }

  async connect() {
    if (!this.isWebBluetoothSupported()) {
      throw new Error('Web Bluetooth not supported. Use Chrome/Edge on desktop.');
    }
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [BLE_CONFIG.serviceUUID] },
          { services: [BLE_CONFIG.standardHR.serviceUUID] },
          { namePrefix: 'FitVision' },
          { namePrefix: 'ESP32' },
          { namePrefix: 'Nano' }
        ],
        optionalServices: [BLE_CONFIG.serviceUUID, BLE_CONFIG.standardHR.serviceUUID]
      });
      this.deviceName = this.device.name || 'Unknown Device';
      this._notifyStatus('connecting');
      this.device.addEventListener('gattserverdisconnected', () => this._handleDisconnect());
      this.server = await this.device.gatt.connect();
      this._notifyStatus('connected');

      let hrChar = null, accelChar = null;
      try {
        this.service = await this.server.getPrimaryService(BLE_CONFIG.serviceUUID);
        hrChar = await this.service.getCharacteristic(BLE_CONFIG.characteristics.heartRate);
        accelChar = await this.service.getCharacteristic(BLE_CONFIG.characteristics.accelerometer);
        try {
          const sc = await this.service.getCharacteristic(BLE_CONFIG.characteristics.deviceStatus);
          this.deviceStatus = new TextDecoder().decode(await sc.readValue());
        } catch (e) {}
      } catch (e) {
        this.service = await this.server.getPrimaryService(BLE_CONFIG.standardHR.serviceUUID);
        hrChar = await this.service.getCharacteristic(BLE_CONFIG.standardHR.measurementCharUUID);
      }

      if (hrChar) {
        await hrChar.startNotifications();
        hrChar.addEventListener('characteristicvaluechanged', (ev) => this._handleHR(ev.target.value));
      }
      if (accelChar) {
        await accelChar.startNotifications();
        accelChar.addEventListener('characteristicvaluechanged', (ev) => this._handleAccel(ev.target.value));
      }
      this.connected = true;
      this._notifyStatus('ready');
      return true;
    } catch (error) {
      this._notifyStatus('error', error.message);
      throw error;
    }
  }

  _handleHR(value) {
    const data = new Uint8Array(value.buffer);
    let hr;
    if (data.length === 1) { hr = data[0]; }
    else { const flags = data[0]; hr = (flags & 0x01) ? (data[1] | (data[2] << 8)) : data[1]; }
    this.heartRate = hr;
    this.heartRateHistory.push({ time: Date.now() / 1000, hr });
    if (this.heartRateHistory.length > 300) this.heartRateHistory = this.heartRateHistory.slice(-300);
    if (this.onHRUpdate) this.onHRUpdate(hr);
  }

  _handleAccel(value) {
    const now = Date.now() / 1000;
    if (value.byteLength >= 6) {
      const data = new DataView(value.buffer);
      this.accelX = data.getInt16(0, true) / 16384.0;
      this.accelY = data.getInt16(2, true) / 16384.0;
      this.accelZ = data.getInt16(4, true) / 16384.0;
    }
    if (this.lastAccelTime > 0) {
      const dt = now - this.lastAccelTime;
      const accelZ_g = this.accelZ - 1.0;
      this.velocity = (this.velocity || 0) + accelZ_g * 9.81 * dt;
      if (Math.abs(accelZ_g) < 0.05) this.velocity *= 0.3;
    }
    this.lastAccelTime = now;
    this.accelHistory.push({ time: now, x: this.accelX, y: this.accelY, z: this.accelZ, vel: Math.abs(this.velocity) });
    if (this.accelHistory.length > 600) this.accelHistory = this.accelHistory.slice(-600);
    if (this.onAccelUpdate) this.onAccelUpdate({ x: this.accelX, y: this.accelY, z: this.accelZ, vel: Math.abs(this.velocity) });
  }

  _handleDisconnect() {
    this.connected = false;
    this._notifyStatus('disconnected');
    setTimeout(() => { if (!this.connected && this.device) { this._notifyStatus('connecting'); this.device.gatt.connect().catch(() => {}); } }, 3000);
  }

  _notifyStatus(status, msg) {
    if (this.onStatusChange) this.onStatusChange({ status, message: msg || '', deviceName: this.deviceName });
  }

  async disconnect() {
    if (this.server && this.server.connected) await this.server.disconnect();
    this.connected = false; this.device = null; this.server = null;
    this._notifyStatus('disconnected');
  }

  getHeartRate() { return this.heartRate || 0; }
  getBarSpeed() { return Math.abs(this.velocity) || 0; }
  getHRZone(maxHR) {
    maxHR = maxHR || 190;
    if (!this.heartRate) return { index: 0, name: '--', color: '#4a90d9' };
    const pct = this.heartRate / maxHR * 100;
    const zones = [
      { name: '热身', range: [0,60], color: '#4a90d9' },
      { name: '燃脂', range: [60,70], color: '#44cc88' },
      { name: '有氧', range: [70,80], color: '#ffcc00' },
      { name: '高强度', range: [80,90], color: '#ff8833' },
      { name: '极限', range: [90,100], color: '#ff3344' }
    ];
    for (let i = 0; i < zones.length; i++) { if (pct < zones[i].range[1]) return { index: i, ...zones[i] }; }
    return { index: 4, ...zones[4] };
  }
}
