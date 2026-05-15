/* ============================================
   rep_detector.js — Trajectory Circle-Based Rep Counter
   v2: Auto-calibrating thresholds + hysteresis zones

   State machine:
     AT_TOP → DESCENDING → AT_BOTTOM → ASCENDING → AT_TOP (+1 rep)

   Auto-calibration: tracks running min/max bar_y and
   adjusts top/bottom thresholds to match the user's
   actual movement range and camera setup.
   ============================================ */

class RepDetector {
  constructor() {
    this.state = 'WAITING';
    this.repCount = 0;
    this.phase = 'idle';
    this.running = false;

    // Smoothing
    this.barYHistory = [];
    this.smoothWindow = 5;

    // Rep timing
    this.lastRepTime = 0;
    this.minRepInterval = 800;

    // Zone thresholds (normalized bar_y 0-1)
    // These are INITIAL wide defaults; auto-calibration narrows them
    this.topRange = [0.60, 0.95];
    this.bottomRange = [0.08, 0.50];

    // Joint angle verification
    this.primaryAngle = null;
    this.angleTopRange = null;
    this.angleBottomRange = null;
    this.currentAngles = null;

    // Trajectory storage
    this.allTrajectories = [];
    this.currentTrajectory = [];

    // Auto-calibration
    this.barYMin = 999;
    this.barYMax = -999;
    this.calibrationSamples = 0;
    this.calibrationNeeded = 40;   // ~2s at 20fps before adjusting
    this.calibrated = false;

    // Hysteresis margin
    this.hysteresis = 0.08;

    this.exercise = 'squat';
  }

  configure(exerciseId, cfg) {
    this.exercise = exerciseId;
    const rd = cfg && cfg.repDetection;
    if (rd) {
      this.topRange = rd.topRange || [0.60, 0.95];
      this.bottomRange = rd.bottomRange || [0.08, 0.50];
      this.primaryAngle = rd.primaryAngle || null;
      this.angleTopRange = rd.angleTopRange || null;
      this.angleBottomRange = rd.angleBottomRange || null;
      this.minRepInterval = rd.minRepInterval || 800;
      this.smoothWindow = rd.smoothWindow || 5;
    }
    this.reset();
  }

  start() {
    if (this.running) return;
    this.reset();
    this.running = true;
    this.state = 'WAITING';
  }

  stop() { this.running = false; }

  reset() {
    this.state = 'WAITING';
    this.repCount = 0;
    this.phase = 'idle';
    this.running = false;
    this.barYHistory = [];
    this.lastRepTime = 0;
    this.allTrajectories = [];
    this.currentTrajectory = [];
    this.currentAngles = null;
    this.barYMin = 999;
    this.barYMax = -999;
    this.calibrationSamples = 0;
    this.calibrated = false;
  }

  update(barPosition, jointAngles, timestamp) {
    if (!this.running) return { repCompleted: false, repCount: this.repCount };
    if (!barPosition || typeof barPosition.y !== 'number') {
      return { repCompleted: false, repCount: this.repCount };
    }
    const now = timestamp || Date.now();
    this.currentAngles = jointAngles || null;

    // ── Smooth bar Y ──
    this.barYHistory.push(barPosition.y);
    if (this.barYHistory.length > this.smoothWindow) this.barYHistory.shift();
    const smoothedY = this.barYHistory.reduce((a, b) => a + b, 0) / this.barYHistory.length;

    // ── Auto-calibration: track running min/max ──
    if (smoothedY < this.barYMin) this.barYMin = smoothedY;
    if (smoothedY > this.barYMax) this.barYMax = smoothedY;
    this.calibrationSamples++;

    if (!this.calibrated && this.calibrationSamples >= this.calibrationNeeded) {
      this._adjustThresholds();
    }
    // Recalibrate every 120 samples (~6s) to adapt to range changes
    if (this.calibrated && this.calibrationSamples > 0 && this.calibrationSamples % 120 === 0) {
      this._adjustThresholds();
    }

    // ── Record trajectory ──
    this.currentTrajectory.push({
      x: barPosition.x, y: smoothedY, phase: this.phase, time: now
    });

    // ── Zone checks with hysteresis ──
    const h = this.hysteresis;
    const droppedBelowTop = smoothedY < (this.topRange[0] - h);
    const roseAboveBottom = smoothedY > (this.bottomRange[1] + h);

    const inTop = smoothedY >= this.topRange[0] && smoothedY <= this.topRange[1];
    const inBottom = smoothedY >= this.bottomRange[0] && smoothedY <= this.bottomRange[1];

    let repCompleted = false;

    // ── State Machine ──
    switch (this.state) {

      case 'WAITING':
        if (inTop) { this.state = 'AT_TOP'; this.phase = 'top_pause'; }
        else if (smoothedY <= this.bottomRange[1]) {
          this.state = 'AT_BOTTOM'; this.phase = 'bottom_pause';
        }
        break;

      case 'AT_TOP':
        if (droppedBelowTop) {
          this.state = 'DESCENDING'; this.phase = 'descending';
        }
        break;

      case 'DESCENDING':
        if (smoothedY <= this.bottomRange[1]) {
          this.state = 'AT_BOTTOM'; this.phase = 'bottom_pause';
        } else if (inTop) {
          this.state = 'AT_TOP'; this.phase = 'top_pause';
        }
        break;

      case 'AT_BOTTOM':
        if (roseAboveBottom) {
          this.state = 'ASCENDING'; this.phase = 'ascending';
        }
        break;

      case 'ASCENDING':
        if (inTop) {
          if (this._canCountRep(now)) {
            this.state = 'AT_TOP'; this.phase = 'top_pause';
            this.repCount++; this.lastRepTime = now;
            repCompleted = true;
            if (this.currentTrajectory.length > 0) {
              this.allTrajectories.push([...this.currentTrajectory]);
            }
            this.currentTrajectory = [];
          }
        } else if (smoothedY <= this.bottomRange[1]) {
          this.state = 'AT_BOTTOM'; this.phase = 'bottom_pause';
        }
        break;
    }

    return { repCompleted, repCount: this.repCount };
  }

  /**
   * Adjust thresholds based on observed min/max bar_y.
   * topRange[0] = (observed max) * 0.92  (leave 8% margin below max)
   * bottomRange[1] = (observed min) * 1.20 (leave 20% margin above min)
   * This adapts to any camera position, person height, and exercise.
   */
  _adjustThresholds() {
    if (this.barYMin >= this.barYMax - 0.02) {
      // Range too narrow — user likely hasn't moved yet, keep defaults
      this.barYMin = 999;
      this.barYMax = -999;
      this.calibrationSamples = 0;
      return;
    }

    // Compute adaptive thresholds from observed range
    const range = this.barYMax - this.barYMin;
    const newTop = this.barYMax - range * 0.10;      // top = max - 10% of range
    const newBottom = this.barYMin + range * 0.15;   // bottom = min + 15% of range

    // Clamp to reasonable bounds
    this.topRange[0] = Math.max(0.45, Math.min(0.80, newTop));
    this.topRange[1] = 0.98;
    this.bottomRange[0] = 0.02;
    this.bottomRange[1] = Math.max(0.15, Math.min(0.55, newBottom));

    this.calibrated = true;

    // Reset min/max for ongoing adaptation
    this.barYMin = 999;
    this.barYMax = -999;
    this.calibrationSamples = 0;

    console.log('[RepDetector] Calibrated thresholds — top:', this.topRange[0].toFixed(2),
                'bottom:', this.bottomRange[1].toFixed(2));
  }

  _canCountRep(now) {
    if (this.lastRepTime > 0 && (now - this.lastRepTime) < this.minRepInterval) return false;
    if (this.primaryAngle && this.angleTopRange && this.currentAngles) {
      const angle = this.currentAngles[this.primaryAngle];
      if (angle !== undefined) {
        if (angle < this.angleTopRange[0] || angle > this.angleTopRange[1]) return false;
      }
    }
    return true;
  }

  getRepCount() { return this.repCount; }
  getPhase() { return this.phase; }
  getState() { return this.state; }
  getRunning() { return this.running; }
  getAllTrajectories() { return this.allTrajectories; }
  getCurrentTrajectory() { return this.currentTrajectory; }
  isCalibrated() { return this.calibrated; }
}
