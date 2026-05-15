/* ============================================
   dashboard.js - Real-time Dashboard with Real + Sim Data
   v2: supports Bluetooth + YOLO + fallback simulation
   ============================================ */

class RealDataSource {
  constructor() {
    this.ble = new BluetoothManager();
    this.yolo = new YoloPoseClient();
    this.fusion = new DataFusion();
    this.sim = new SimulationEngine();
    this.repDetector = new RepDetector();
    this.useBLE = false;
    this.useYOLO = false;
    this.useSim = true;         // Fallback always available
    this.exercise = 'squat';
  }

  connectBLE() { return this.ble.connect(); }
  disconnectBLE() { this.ble.disconnect(); }
  connectYOLO() { return this.yolo.connect(); }
  disconnectYOLO() { this.yolo.disconnect(); }

  start(exercise) {
    this.exercise = exercise || this.exercise;
    const cfg = EXERCISE_CONFIG[this.exercise];
    this.repDetector.configure(this.exercise, cfg);
    this.repDetector.start();
    if (this.useSim) this.sim.start(this.exercise);
  }
  stop() {
    this.repDetector.stop();
    if (this.useSim) this.sim.stop();
  }
  reset() {
    this.sim.reset();
    this.fusion.reset();
    this.repDetector.reset();
  }

  /** Tick data update (called every 50ms) */
  update(dt = 50) {
    if (this.useSim) this.sim.update(dt);

    // Gather real data
    const btData = this.useBLE ? {
      connected: this.ble.connected,
      heartRate: this.ble.getHeartRate(),
      velocity: this.ble.getBarSpeed(),
      accelX: this.ble.accelX, accelY: this.ble.accelY, accelZ: this.ble.accelZ
    } : { connected: false, heartRate: 0, velocity: 0 };

    const yoloData = this.useYOLO ? {
      connected: this.yolo.isConnected(),
      jointAngles: this.yolo.getAngles(),
      barPosition: this.yolo.getBarPosition(),
      keypoints: this.yolo.keypoints,
      fps: this.yolo.fps
    } : { connected: false, jointAngles: {}, barPosition: null };

    // Fuse data
    const cfg = EXERCISE_CONFIG[this.exercise];
    this.fusion.update(btData, yoloData, cfg);
    // Feed real data to rep detector
    if (this.useYOLO && this.yolo.isConnected() && this.repDetector.running) {
      this.repDetector.update(this.fusion.getBarPosition(), this.fusion.getJointAngles(), Date.now());
    }
  }

  getBarPosition() {
    if (this.useYOLO && this.yolo.isConnected()) return this.fusion.getBarPosition();
    return { x: this.sim.barX, y: this.sim.barY };
  }

  getBarTrajectory() {
    if (this.useYOLO && this.repDetector.running) return this.repDetector.getCurrentTrajectory();
    return this.sim.barTrajectory || [];
  }

  getAllTrajectories() {
    if (this.useYOLO && this.repDetector.running) return this.repDetector.getAllTrajectories();
    return this.sim.allTrajectories || [];
  }

  getJointAngles() {
    if (this.useYOLO && this.yolo.isConnected()) return this.fusion.getJointAngles();
    return this.sim.angles;
  }

  getKeypoints() {
    if (this.useYOLO && this.yolo.isConnected() && this.yolo.keypoints) {
      return this.yolo.keypoints;
    }
    return null;
  }

  getMetrics() {
    if (this.useYOLO || this.useBLE) {
      return {
        hip: this.fusion.getJointAngles().hip || 90,
        knee: this.fusion.getJointAngles().knee || 85,
        trunk: this.fusion.getJointAngles().trunk || 40,
        shoulder: this.fusion.getJointAngles().shoulder || 80,
        speed: this.useBLE ? this.fusion.getBarSpeed().toFixed(1) : '0.8',
        deviation: this.fusion.getBarDeviation(),
        posture: this.fusion.getPostureScore()
      };
    }
    return this.sim.getMetrics();
  }

  getHeartRateData() {
    if (this.useBLE && this.ble.connected) {
      return {
        current: this.ble.getHeartRate(),
        max: 190,
        percent: Math.round(this.ble.getHeartRate() / 190 * 100),
        zone: this.ble.getHRZone(),
        history: this.ble.heartRateHistory,
        calories: Math.round(this.sim.calories || 0),
        trainingTime: this.sim.formatTime(this.sim.totalTime || 0)
      };
    }
    // No BLE — return empty data so UI shows "--"
    return {
      current: 0,
      max: 190,
      percent: 0,
      zone: null,
      history: [],
      calories: Math.round(this.sim.calories || 0),
      trainingTime: this.sim.formatTime(this.sim.totalTime || 0)
    };
  }

  getPostureScore() {
    if (this.useYOLO) return this.fusion.getPostureScore();
    return this.sim.getPostureScore();
  }

  getWarnings() {
    return this.sim.getWarnings();
  }

  getRepCount() {
    if (this.useYOLO && this.repDetector.running) return this.repDetector.getRepCount();
    return this.sim.repCount;
  }
  getSetCount() { return this.sim.setCount; }
  get Phase() {
    if (this.useYOLO && this.repDetector.running) return this.repDetector.getPhase();
    return this.sim.phase;
  }
  get Running() {
    if (this.useYOLO && this.repDetector.running) return this.repDetector.getRunning();
    return this.sim.running;
  }
}

// ─── Dashboard ───

class Dashboard {
  constructor() {
    this.source = new RealDataSource();
    this.trajectoryView = null;
    this.skeletonView = null;
    this.chartsManager = null;
    this.updateInterval = null;
    this.frameRate = 50;
    this.lastWarningTime = 0;
    this.warningCooldown = 5000;
    this.exercise = 'squat';
    this.isRunning = false;
    this.onSessionComplete = null;  // callback(summary) 在全部组完成后调用
  }

  init() {
    this.trajectoryView = new TrajectoryView('trajectoryCanvas');
    this.skeletonView = new SkeletonView('skeletonCanvas');
    this.chartsManager = new ChartsManager();
    this.setExercise(this.exercise);
    const cfg = EXERCISE_CONFIG[this.exercise];
    this.skeletonView.update(this.source.sim.angles, cfg.ideal);
    this.bindEvents();
    // Apply i18n to dynamic/exercise elements
    applyI18n();
  }

  setExercise(exId) {
    this.exercise = exId;
    const cfg = EXERCISE_CONFIG[exId];
    this.trajectoryView.setIdealPath(cfg.idealTrajectory);
    this.trajectoryView.draw();
    this.skeletonView.idealRanges = cfg.ideal;
    document.querySelectorAll('.ex-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.exercise === exId);
    });
    this.source.exercise = exId;
    if (!this.isRunning) {
      this.source.sim.angles = {
        hip: cfg.ideal.hip[0] + (cfg.ideal.hip[1] - cfg.ideal.hip[0]) * 0.5,
        knee: cfg.ideal.knee ? cfg.ideal.knee[0] + (cfg.ideal.knee[1] - cfg.ideal.knee[0]) * 0.5 : 85,
        trunk: cfg.ideal.trunk[0] + (cfg.ideal.trunk[1] - cfg.ideal.trunk[0]) * 0.5,
        shoulder: cfg.ideal.shoulder[0] + (cfg.ideal.shoulder[1] - cfg.ideal.shoulder[0]) * 0.5,
        ankle: cfg.ideal.ankle ? cfg.ideal.ankle[0] + (cfg.ideal.ankle[1] - cfg.ideal.ankle[0]) * 0.5 : 70,
        elbow: cfg.ideal.elbow ? cfg.ideal.elbow[0] + (cfg.ideal.elbow[1] - cfg.ideal.elbow[0]) * 0.5 : 80
      };
      this.skeletonView.update(this.source.sim.angles, cfg.ideal);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.chartsManager.init();
    this.source.start(this.exercise);
    this._initialSetCount = this.source.sim.setCount;
    document.getElementById('btnStart').style.display = 'none';
    document.getElementById('btnPause').style.display = 'flex';
    document.getElementById('btnSaveRecord').style.display = 'flex';
    this.updateInterval = setInterval(() => this.tick(), this.frameRate);
  }

  pause() {
    this.isRunning = false;
    this.source.stop();
    clearInterval(this.updateInterval);
    document.getElementById('btnStart').style.display = 'flex';
    document.getElementById('btnPause').style.display = 'none';
    // keep Save Record visible after pause for partial save
  }

  reset() {
    this.pause();
    this.source.reset();
    this.trajectoryView.currentRepPoints = [];
    this.trajectoryView.previousRepPoints = [];
    this.trajectoryView.trailPoints = [];
    this.trajectoryView.draw();
    const cfg = EXERCISE_CONFIG[this.exercise];
    this.skeletonView.update(this.source.sim.angles, cfg.ideal);
    document.getElementById('repCount').textContent = '0';
    document.getElementById('trajectoryScore').textContent = '--';
    document.getElementById('postureScore').textContent = '--';
    document.getElementById('alertBanner').style.display = 'none';
    document.getElementById('btnSaveRecord').style.display = 'none';
  }

  /** Immediately save current training data (partial or complete) */
  saveRecord() {
    const sim = this.source.sim;
    const scores = sim.sessionScores;
    if (!scores.length) return;  // nothing to save

    this.pause();
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const dt = new Date();
    let label;
    if (avg >= 90) label = '优秀';
    else if (avg >= 80) label = '良好';
    else if (avg >= 70) label = '一般';
    else label = '需改进';

    const completedSets = (this._initialSetCount || 3) - sim.setCount + (sim.repCount > 0 ? 1 : 0);
    const summary = {
      day: String(dt.getDate()),
      month: `${dt.getMonth() + 1}月`,
      exercise: this.exercise,
      sets: Math.max(1, completedSets),
      reps: scores.length,
      weight: 60 + Math.floor(Math.random() * 40),
      score: avg,
      scoreLabel: label,
      totalTime: sim.totalTime,
      calories: Math.round(sim.calories)
    };

    if (this.onSessionComplete) {
      this.onSessionComplete(summary);
    }

    // Reset state
    this.source.reset();
    this.trajectoryView.currentRepPoints = [];
    this.trajectoryView.previousRepPoints = [];
    this.trajectoryView.trailPoints = [];
    this.trajectoryView.draw();
    document.getElementById('repCount').textContent = '0';
    document.getElementById('setCount').textContent = '0';
    document.getElementById('trajectoryScore').textContent = '--';
    document.getElementById('postureScore').textContent = '--';
    document.getElementById('btnStart').style.display = 'flex';
    document.getElementById('btnPause').style.display = 'none';
    document.getElementById('btnSaveRecord').style.display = 'none';
  }

  tick() {
    this.source.update(this.frameRate);
    if (this.source.Phase === 'rest_between_sets') {
      // 先更新所有显示，让最后一rep可见
      const m = this.source.getMetrics();
      const hrData = this.source.getHeartRateData();
      const cfg = EXERCISE_CONFIG[this.exercise];
      this.trajectoryView.update(this.source.getBarPosition().x, this.source.getBarPosition().y,
        this.source.getAllTrajectories(), this.source.getBarTrajectory());
      this.skeletonView.update(this.source.getJointAngles(), cfg.ideal, this.source.getKeypoints());
      this._updateMetrics(m, cfg);
      document.getElementById('repCount').textContent = this.source.getRepCount();
      document.getElementById('setCount').textContent = this.source.getSetCount();
      const ps = this.source.getPostureScore();
      document.getElementById('trajectoryScore').textContent = `${ps} 分`;
      document.getElementById('postureScore').textContent = `${ps} 分`;
      this._updateHRDisplay(hrData);
      this._updateMiniHR(hrData);
      this._checkWarnings();

      this.pause();
      setTimeout(() => {
        this.source.sim.setCount--;
        if (this.source.sim.setCount > 0) {
          // 开始下一组
          document.getElementById('setCount').textContent = this.source.sim.setCount;
          this.source.sim.phase = 'descending';
          this.source.sim.phaseTime = 0;
          this.source.sim.repCount = 0;
          this.source.sim.barTrajectory = [];
          this.source.sim.allTrajectories = [];
          this.source.sim.running = true;
          this.isRunning = true;
          document.getElementById('btnStart').style.display = 'none';
          document.getElementById('btnPause').style.display = 'flex';
          document.getElementById('btnSaveRecord').style.display = 'flex';
          this.updateInterval = setInterval(() => this.tick(), this.frameRate);
        } else {
          // 所有组完成
          document.getElementById('repCount').textContent = '0';
          document.getElementById('setCount').textContent = '0';
          if (this.onSessionComplete) {
            const summary = this.source.sim.getSessionSummary();
            this.onSessionComplete(summary);
          }
        }
      }, 2000);
      return;
    }

    const m = this.source.getMetrics();
    const hrData = this.source.getHeartRateData();
    const cfg = EXERCISE_CONFIG[this.exercise];

    // Trajectory view
    const barPos = this.source.getBarPosition();
    this.trajectoryView.update(barPos.x, barPos.y,
      this.source.getAllTrajectories(),
      this.source.getBarTrajectory()
    );

    // Skeleton view
    this.skeletonView.update(this.source.getJointAngles(), cfg.ideal, this.source.getKeypoints());

    // Metrics
    this._updateMetrics(m, cfg);

    // Rep/set counts
    document.getElementById('repCount').textContent = this.source.getRepCount();
    document.getElementById('setCount').textContent = this.source.getSetCount();

    // Scores
    const ps = this.source.getPostureScore();
    document.getElementById('trajectoryScore').textContent = `${ps} 分`;
    document.getElementById('trajectoryScore').className = ps >= 80 ? 'viz-badge success' : 'viz-badge';
    document.getElementById('postureScore').textContent = `${ps} 分`;

    // HR display
    this._updateHRDisplay(hrData);
    // Mini HR in training bar
    this._updateMiniHR(hrData);

    // HR chart
    if (this.chartsManager.initialized) {
      this.chartsManager.updateHRChart(this.source.sim.hrHistory.length > 0
        ? this.source.sim.hrHistory : this.source.ble.heartRateHistory);
    }

    // Warnings
    this._checkWarnings();
  }

  _updateMetrics(m, cfg) {
    const setM = (id, val, barId, w) => {
      document.getElementById(id).textContent = val;
      const bar = document.getElementById(barId);
      if (bar) bar.style.width = `${Math.max(5, Math.min(100, w))}%`;
    };
    setM('metricHip', `${m.hip}°`, 'metricHipBar', m.hip / 180 * 100);
    setM('metricKnee', `${m.knee}°`, 'metricKneeBar', m.knee / 180 * 100);
    setM('metricTrunk', `${m.trunk}°`, 'metricTrunkBar', m.trunk / 90 * 100);
    setM('metricShoulder', `${m.shoulder}°`, 'metricShoulderBar', m.shoulder / 180 * 100);
    setM('metricSpeed', `${m.speed} m/s`, 'metricSpeedBar', parseFloat(m.speed) / 1.5 * 100);
    setM('metricDeviation', `${m.deviation} cm`, 'metricDeviationBar', m.deviation / 5 * 100);

    const updateColor = (barId, val, range) => {
      const bar = document.getElementById(barId);
      if (!bar || !range) return;
      if (val < range[0] - 5 || val > range[1] + 5) { bar.className = 'metric-fill'; bar.style.background = '#ff4444'; }
      else if (val < range[0] || val > range[1]) { bar.className = 'metric-fill'; bar.style.background = '#ff6b35'; }
      else { bar.className = 'metric-fill green'; bar.style.background = ''; }
    };
    updateColor('metricHipBar', m.hip, cfg.ideal.hip);
    updateColor('metricKneeBar', m.knee, cfg.ideal.knee);
    updateColor('metricTrunkBar', m.trunk, cfg.ideal.trunk);
    updateColor('metricShoulderBar', m.shoulder, cfg.ideal.shoulder);
  }

  _updateHRDisplay(hrData) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('hrValue', hrData.current > 0 ? hrData.current : '--');
    set('hrMaxPercent', hrData.current > 0 ? `${hrData.percent}% HRmax` : '--% HRmax');
    if (hrData.zone && document.getElementById('hrZoneLabel')) {
      const zl = document.getElementById('hrZoneLabel');
      zl.textContent = hrData.zone.name;
      zl.style.color = hrData.zone.color;
    }
    const ind = document.getElementById('hrZoneIndicator');
    if (ind) ind.style.left = `${hrData.percent}%`;
    set('hrTrainingTime', hrData.trainingTime);
    set('hrAvg', hrData.history && hrData.history.length > 0
      ? `${Math.round(hrData.history.reduce((s, p) => s + p.hr, 0) / hrData.history.length)} bpm` : '-- bpm');
    set('hrMax', hrData.history && hrData.history.length > 0
      ? `${Math.max(...hrData.history.map(p => p.hr))} bpm` : '-- bpm');
    set('hrCalories', `${hrData.calories} kcal`);
    set('hrZone', hrData.zone ? hrData.zone.name : '--');
    set('hrRecovery', hrData.percent < 70 ? (getCurrentLang() === 'zh' ? '良好' : 'Good') : (getCurrentLang() === 'zh' ? '恢复中...' : 'Recovering...'));
  }

  _updateMiniHR(hrData) {
    const val = document.getElementById('miniHRValue');
    const bt = document.getElementById('miniBTStatus');
    if (val) val.textContent = hrData.current > 0 ? hrData.current : '--';
    if (bt) {
      const connected = this.source.useBLE && this.source.ble.connected;
      bt.textContent = connected ? '⚡BT ✓' : '⚡--';
      bt.className = 'mini-hr-bt' + (connected ? ' online' : '');
    }
  }

  _checkWarnings() {
    const now = Date.now();
    if (now - this.lastWarningTime < this.warningCooldown) return;
    const warnings = this.source.getWarnings();
    if (warnings.length > 0) {
      this.lastWarningTime = now;
      const wKey = warnings[0].key;
      const text = t(`alert.${wKey}`) || warnings[0].text;
      this._showWarning(text);
      setTimeout(() => {
        const b = document.getElementById('alertBanner');
        if (b) b.style.display = 'none';
      }, 4000);
    }
  }

  _showWarning(text) {
    const banner = document.getElementById('alertBanner');
    const alertText = document.getElementById('alertText');
    if (banner && alertText) {
      alertText.textContent = text;
      banner.style.display = 'flex';
      banner.style.animation = 'none';
      banner.offsetHeight;
      banner.style.animation = 'alertShake 0.5s ease';
    }
  }

  bindEvents() {
    document.querySelectorAll('.ex-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const exId = btn.dataset.exercise;
        if (this.isRunning) this.reset();
        this.setExercise(exId);
      });
    });
    document.getElementById('btnStart').addEventListener('click', () => this.start());
    document.getElementById('btnPause').addEventListener('click', () => this.pause());
    document.getElementById('btnReset').addEventListener('click', () => this.reset());
    document.getElementById('btnSaveRecord').addEventListener('click', () => this.saveRecord());
    document.getElementById('alertClose').addEventListener('click', () => {
      document.getElementById('alertBanner').style.display = 'none';
    });
    // Single tutorial button
    document.getElementById('btnTutorial').addEventListener('click', () => {
      this.openTutorial(this.exercise);
    });
    // Tutorial modal tabs
    document.querySelectorAll('.tutorial-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const exId = tab.dataset.ex;
        this._switchTutorialTab(exId);
      });
    });
    // Tutorial modal close
    document.getElementById('tutorialClose').addEventListener('click', () => {
      document.getElementById('tutorialModal').style.display = 'none';
    });
    document.getElementById('tutorialModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        document.getElementById('tutorialModal').style.display = 'none';
      }
    });
  }

  _switchTutorialTab(exId) {
    document.querySelectorAll('.tutorial-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.ex === exId);
    });
    this._renderTutorialContent(exId);
  }

  _renderTutorialContent(exerciseId) {
    const tutorial = EXERCISE_TUTORIALS[exerciseId];
    if (!tutorial) return;

    const lang = getCurrentLang();
    const isZh = lang === 'zh';

    // GIF
    const gifEl = document.getElementById('tutorialGif');
    const ph = document.getElementById('tutorialGifPlaceholder');
    if (gifEl && ph) {
      gifEl.style.display = '';
      gifEl.onerror = function() { this.style.display = 'none'; ph.style.display = 'flex'; };
      gifEl.src = tutorial.gif;
      ph.style.display = 'none';
    }

    // Analysis
    document.getElementById('tutorialAnalysis').textContent =
      isZh ? tutorial.analysis : tutorial.analysisEn;

    // Target muscles
    const musclesList = isZh ? tutorial.targetMuscles : tutorial.targetMusclesEn;
    document.getElementById('tutorialMuscles').innerHTML = musclesList
      .map(m => `<span class="tutorial-muscle-tag">${m}</span>`)
      .join('');

    // Steps
    const stepsList = isZh ? tutorial.steps : tutorial.stepsEn;
    document.getElementById('tutorialSteps').innerHTML = stepsList
      .map(s => `<li>${s}</li>`)
      .join('');

    // Mistakes
    const mistakesList = isZh ? tutorial.mistakes : tutorial.mistakesEn;
    document.getElementById('tutorialMistakes').innerHTML = mistakesList
      .map(m => `<li>${m}</li>`)
      .join('');

    // Section titles i18n
    document.querySelectorAll('#tutorialModal .tutorial-section-title').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
  }

  openTutorial(exerciseId) {
    // Highlight the correct tab
    this._switchTutorialTab(exerciseId);
    // Show modal
    document.getElementById('tutorialModal').style.display = 'flex';
  }
}
