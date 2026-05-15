/* ============================================
   simulation.js — 模拟数据生成引擎
   ============================================ */

class SimulationEngine {
  constructor() {
    this.running = false;
    this.exercise = 'squat';
    this.phase = 'idle';        // idle | descending | bottom_pause | ascending | top_pause
    this.phaseTime = 0;
    this.repCount = 0;
    this.setCount = 3;
    this.totalTime = 0;
    this.heartRate = 78;
    this.targetHR = 78;
    this.hrHistory = [];
    this.calories = 0;
    this.warnings = [];
    this.sessionScores = [];   // 本次训练每rep结束时的评分

    // 各阶段持续时间 (ms)
    this.phaseDurations = {
      descending: 2000,
      bottom_pause: 400,
      ascending: 2000,
      top_pause: 800
    };

    // 当前关节角度
    this.angles = { hip: 90, knee: 85, trunk: 40, shoulder: 80, ankle: 70, elbow: 80 };

    // 杠铃位置 0-1 归一化
    this.barX = 0.50;
    this.barY = 0.85;
    this.barTrajectory = [];       // 当前 rep 轨迹
    this.allTrajectories = [];     // 所有 rep 的轨迹

    // 模拟噪声种子
    this.noiseSeeds = {
      barX: Math.random() * 0.04,
      barY: Math.random() * 0.02,
      hip: Math.random() * 5,
      knee: Math.random() * 5,
      trunk: Math.random() * 4,
      shoulder: Math.random() * 3
    };
  }

  reset() {
    this.running = false;
    this.phase = 'idle';
    this.phaseTime = 0;
    this.repCount = 0;
    this.totalTime = 0;
    this.heartRate = 78;
    this.targetHR = 78;
    this.hrHistory = [];
    this.calories = 0;
    this.warnings = [];
    this.sessionScores = [];
    this.barTrajectory = [];
    this.allTrajectories = [];
    this.barX = 0.50;
    this.barY = 0.85;
    this.angles = { hip: 90, knee: 85, trunk: 40, shoulder: 80, ankle: 70, elbow: 80 };
  }

  start(exercise) {
    this.exercise = exercise || this.exercise;
    if (!this.running) {
      this.reset();
      this.setCount = 3;
    }
    this.running = true;
    // 根据动作设置初始角度
    const cfg = EXERCISE_CONFIG[this.exercise];
    this.angles = {
      hip: cfg.ideal.hip[0] + (cfg.ideal.hip[1] - cfg.ideal.hip[0]) * 0.5,
      knee: cfg.ideal.knee ? cfg.ideal.knee[0] + (cfg.ideal.knee[1] - cfg.ideal.knee[0]) * 0.5 : 85,
      trunk: cfg.ideal.trunk[0] + (cfg.ideal.trunk[1] - cfg.ideal.trunk[0]) * 0.5,
      shoulder: cfg.ideal.shoulder[0] + (cfg.ideal.shoulder[1] - cfg.ideal.shoulder[0]) * 0.5,
      ankle: cfg.ideal.ankle ? cfg.ideal.ankle[0] + (cfg.ideal.ankle[1] - cfg.ideal.ankle[0]) * 0.5 : 70,
      elbow: cfg.ideal.elbow ? cfg.ideal.elbow[0] + (cfg.ideal.elbow[1] - cfg.ideal.elbow[0]) * 0.5 : 80
    };
    if (this.phase === 'idle') {
      this.phase = 'descending';
    }
  }

  stop() {
    this.running = false;
    this.phase = 'idle';
  }

  // 每帧调用 (约 60fps => dt=16ms，我们外部用 setInterval 控制)
  update(dt = 50) {
    if (!this.running) return;

    const dtSec = dt / 1000;
    this.totalTime += dtSec;
    this.phaseTime += dt;

    const cfg = EXERCISE_CONFIG[this.exercise];
    const pd = this.phaseDurations;

    // 1. 更新杠铃位置
    this.updateBarbell(dt, pd, cfg);

    // 2. 更新关节角度
    this.updateAngles(cfg);

    // 3. 更新心率
    this.updateHeartRate(dtSec);

    // 4. 更新卡路里
    this.calories += (0.08 + Math.random() * 0.02) * dtSec * (this.heartRate / 100);

    // 5. 阶段切换
    if (this.phaseTime >= pd[this.phase]) {
      this.advancePhase();
    }
  }

  updateBarbell(dt, phaseDurations, cfg) {
    const progress = Math.min(this.phaseTime / phaseDurations[this.phase], 1.0);
    const ideal = cfg.idealTrajectory;

    // 确定当前 rep 的起始/结束在 ideal 轨迹上的位置
    let startIdx, endIdx;
    switch (this.phase) {
      case 'descending':
        startIdx = 0; endIdx = Math.floor(ideal.length / 2);
        break;
      case 'ascending':
        startIdx = Math.floor(ideal.length / 2); endIdx = ideal.length - 1;
        break;
      default:
        return; // 底部/顶部停顿不更新
    }

    const idx = startIdx + progress * (endIdx - startIdx);
    const idxLow = Math.floor(idx);
    const idxHigh = Math.min(idxLow + 1, ideal.length - 1);
    const frac = idx - idxLow;

    const idealX = ideal[idxLow].x + (ideal[idxHigh].x - ideal[idxLow].x) * frac;
    const idealY = ideal[idxLow].y + (ideal[idxHigh].y - ideal[idxLow].y) * frac;

    // 添加噪声/偏差模拟真实运动
    const barNoiseX = this.noiseSeeds.barX * Math.sin(this.totalTime * 2.5) * progress;
    const barNoiseY = this.noiseSeeds.barY * Math.sin(this.totalTime * 3.0) * progress;

    // 针对不同动作的特定偏差
    let deviationX = 0, deviationY = 0;
    if (this.exercise === 'squat') {
      deviationX = 0.015 * progress; // 轻微前移
    } else if (this.exercise === 'bench') {
      deviationX = 0.01 * Math.sin(this.totalTime * 1.5);
    } else if (this.exercise === 'deadlift') {
      deviationX = 0.025 * progress; // 杠铃远离身体
    }

    this.barX = idealX + barNoiseX + deviationX;
    this.barY = idealY + barNoiseY + deviationY;

    // 记录轨迹点（仅在下放和上升阶段）
    if (this.phase === 'descending' || this.phase === 'ascending') {
      this.barTrajectory.push({ x: this.barX, y: this.barY, phase: this.phase });
    }
  }

  updateAngles(cfg) {
    const progress = this.phase === 'descending' ?
      Math.min(this.phaseTime / this.phaseDurations.descending, 1) :
      this.phase === 'ascending' ?
        1 - Math.min(this.phaseTime / this.phaseDurations.ascending, 1) :
        this.phase === 'bottom_pause' ? 1 :
        this.phase === 'top_pause' ? 0 : 0;

    const noise = () => (Math.random() - 0.5) * 3;

    if (this.exercise === 'squat' || this.exercise === 'deadlift') {
      const ideal = cfg.ideal;
      // 用 progress 在理想范围的 max (顶部) 和 min (底部) 之间插值
      this.angles.hip = lerp(ideal.hip[1], ideal.hip[0], progress) + noise();
      if (ideal.knee) this.angles.knee = lerp(ideal.knee[1], ideal.knee[0], progress) + noise();
      this.angles.trunk = lerp(ideal.trunk[1], ideal.trunk[0], progress) + noise();
    } else if (this.exercise === 'bench') {
      this.angles.elbow = lerp(90, 75, progress) + noise();
      this.angles.shoulder = lerp(85, 80, progress) + noise();
    } else if (this.exercise === 'ohp') {
      this.angles.shoulder = lerp(30, 175, 1 - progress) + noise();
      this.angles.elbow = lerp(80, 175, 1 - progress) + noise();
    }
  }

  updateHeartRate(dtSec) {
    // 基于训练阶段的目标心率
    const phaseIntensity = this.phase === 'descending' || this.phase === 'ascending' ? 1.0 :
                           this.phase === 'bottom_pause' ? 0.95 : 0.85;

    const restHR = 78;
    const maxExertion = 155;
    this.targetHR = restHR + (maxExertion - restHR) * phaseIntensity * (0.6 + this.repCount * 0.03);

    // 心率平滑过渡
    const hrSpeed = 2.0; // bpm per second
    if (this.heartRate < this.targetHR) {
      this.heartRate = Math.min(this.heartRate + hrSpeed * dtSec, this.targetHR);
    } else {
      this.heartRate = Math.max(this.heartRate - hrSpeed * dtSec * 0.5, this.targetHR);
    }

    this.heartRate += (Math.random() - 0.5) * 0.8; // 微小波动

    // 记录心率历史（每 2 秒一次）
    const lastRecord = this.hrHistory.length > 0 ? this.hrHistory[this.hrHistory.length - 1] : null;
    if (!lastRecord || this.totalTime - lastRecord.time > 2) {
      this.hrHistory.push({ time: this.totalTime, hr: Math.round(this.heartRate) });
      if (this.hrHistory.length > 150) this.hrHistory.shift();
    }
  }

  advancePhase() {
    this.phaseTime = 0;

    switch (this.phase) {
      case 'descending':
        this.phase = 'bottom_pause';
        break;
      case 'bottom_pause':
        this.phase = 'ascending';
        break;
      case 'ascending':
        this.phase = 'top_pause';
        this.repCount++;
        this.sessionScores.push(this.getPostureScore());
        // 保存本次 rep 的轨迹
        if (this.barTrajectory.length > 0) {
          this.allTrajectories.push([...this.barTrajectory]);
        }
        this.barTrajectory = [];
        // 检测是否需要切换组
        if (this.repCount >= 8) {
          // 模拟组间休息
          this.running = false;
          this.phase = 'rest_between_sets';
        }
        break;
      case 'top_pause':
        if (this.repCount < 8) {
          this.phase = 'descending';
        }
        break;
    }
  }

  // 获取杠铃偏移量 cm（模拟）
  getBarDeviation() {
    const cfg = EXERCISE_CONFIG[this.exercise];
    const idealTop = cfg.idealTrajectory[0];
    return parseFloat((Math.abs(this.barX - idealTop.x) * 15).toFixed(1));
  }

  // 获取姿势评分（模拟）
  getPostureScore() {
    const cfg = EXERCISE_CONFIG[this.exercise];
    let score = 85;
    // 偏差越大分数越低
    const dev = this.getBarDeviation();
    score -= dev * 1.5;
    // 随机小波动
    score += (Math.random() - 0.5) * 3;
    return Math.max(50, Math.min(98, Math.round(score)));
  }

  // 获取弧度变化率（用于不稳定检测）
  getStability() {
    return 0.3 + Math.random() * 0.4;
  }

  // 获取警告
  getWarnings() {
    const cfg = EXERCISE_CONFIG[this.exercise];
    const warnings = [];
    const dev = this.getBarDeviation();
    const stability = this.getStability();

    for (const err of cfg.errors) {
      if ((err.key === 'bar_forward' || err.key === 'bar_asymmetry' || err.key === 'bar_away') && dev > err.threshold * 15) {
        warnings.push(err);
      } else if (err.key === 'forward_lean' && Math.random() < 0.04) {
        warnings.push(err);
      } else if (err.key === 'back_rounding' && Math.random() < 0.03) {
        warnings.push(err);
      }
    }

    return warnings;
  }

  getMetrics() {
    return {
      hip: Math.round(this.angles.hip),
      knee: Math.round(this.angles.knee),
      trunk: Math.round(this.angles.trunk),
      shoulder: Math.round(this.angles.shoulder),
      speed: (0.6 + Math.random() * 0.4).toFixed(1),
      deviation: this.getBarDeviation(),
      posture: this.getPostureScore()
    };
  }

  getHeartRateData() {
    return {
      current: Math.round(this.heartRate),
      max: 190, // 假设最大心率
      percent: Math.round(this.heartRate / 190 * 100),
      zone: this.getHRZone(),
      history: this.hrHistory,
      calories: Math.round(this.calories),
      trainingTime: this.formatTime(this.totalTime)
    };
  }

  getHRZone() {
    const pct = this.heartRate / 190 * 100;
    for (let i = 0; i < HR_ZONES.length; i++) {
      if (pct >= HR_ZONES[i].range[0] && pct < HR_ZONES[i].range[1]) {
        return { index: i, ...HR_ZONES[i] };
      }
    }
    return { index: 4, ...HR_ZONES[4] };
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  getSessionSummary() {
    const scores = this.sessionScores;
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;
    const dt = new Date();
    let label;
    if (avg >= 90) label = '优秀';
    else if (avg >= 80) label = '良好';
    else if (avg >= 70) label = '一般';
    else label = '需改进';
    return {
      day: String(dt.getDate()),
      month: `${dt.getMonth() + 1}月`,
      exercise: this.exercise,
      sets: 3,
      reps: 8,
      weight: 60 + Math.floor(Math.random() * 40),  // 模拟重量 60–100kg
      score: avg,
      scoreLabel: label,
      totalTime: this.totalTime,
      calories: Math.round(this.calories)
    };
  }
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
