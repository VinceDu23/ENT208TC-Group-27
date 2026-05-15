class DataFusion {
  constructor() {
    this.barPosition = { x: 0.50, y: 0.85 };
    this.jointAngles = { hip: 90, knee: 85, trunk: 40, shoulder: 80, elbow: 80, ankle: 70 };
    this.barSpeed = 0; this.heartRate = 0; this.postureScore = 85; this.barDeviation = 0;
    this.angleHistory = []; this.maxHistory = 10;
  }

  update(bt, yolo, cfg) {
    if (yolo && yolo.jointAngles && Object.keys(yolo.jointAngles).length) {
      this.angleHistory.push({...yolo.jointAngles});
      if (this.angleHistory.length > this.maxHistory) this.angleHistory.shift();
      const avg = {};
      for (const k of Object.keys(yolo.jointAngles)) {
        let s = 0, c = 0;
        for (const h of this.angleHistory) { if (h[k] !== undefined) { s += h[k]; c++; } }
        avg[k] = c > 0 ? Math.round(s / c) : yolo.jointAngles[k];
      }
      this.jointAngles = avg;
    }
    if (yolo && yolo.barPosition) {
      this.barPosition.x = this.barPosition.x * 0.3 + yolo.barPosition.x * 0.7;
      this.barPosition.y = this.barPosition.y * 0.3 + yolo.barPosition.y * 0.7;
    }
    if (bt && bt.connected) {
      this.barSpeed = bt.velocity || 0;
      if (bt.heartRate > 0) this.heartRate = bt.heartRate;
    }
    if (cfg && cfg.ideal) {
      const i = cfg.ideal;
      let t = 0, c = 0;
      for (const [k, r] of [['hip',i.hip],['knee',i.knee],['trunk',i.trunk],['shoulder',i.shoulder]]) {
        if (!r || this.jointAngles[k] === undefined) continue;
        const mid = (r[0] + r[1]) / 2;
        const tol = (r[1] - r[0]) / 2;
        t += Math.max(0, 100 - Math.abs(this.jointAngles[k] - mid) / (tol + 1) * 30);
        c++;
      }
      this.postureScore = c > 0 ? Math.max(40, Math.min(98, Math.round(t / c))) : 85;
    }
    if (cfg && cfg.idealTrajectory)
      this.barDeviation = +(Math.abs(this.barPosition.x - cfg.idealTrajectory[0].x) * 15).toFixed(1);
  }

  getBarPosition() { return this.barPosition; }
  getJointAngles() { return this.jointAngles; }
  getBarSpeed() { return this.barSpeed; }
  getHeartRate() { return this.heartRate; }
  getPostureScore() { return this.postureScore; }
  getBarDeviation() { return this.barDeviation; }
  reset() {
    this.barPosition = { x: 0.50, y: 0.85 };
    this.barSpeed = 0;
    this.angleHistory = [];
  }
}
