/* ============================================
   app.js - Main Entry, Tab Switching, BLE/YOLO UI, i18n
   ============================================ */

class App {
  constructor() {
    this.dashboard = null;
    this.aiCoach = null;
    this.currentTab = 'dashboard';
  }

  init() {
    // Theme first — apply before any render
    this._applyTheme();

    // i18n first
    applyI18n();

    // Init dashboard
    this.dashboard = new Dashboard();
    this.dashboard.init();

    // Session completion callback: save record when all sets finish
    this.dashboard.onSessionComplete = (summary) => {
      const existingIdx = TRAINING_HISTORY.findIndex(r =>
        r.day === summary.day && r.month === summary.month && r.exercise === summary.exercise);
      const record = { ...summary };
      if (existingIdx >= 0) {
        TRAINING_HISTORY[existingIdx] = record;
      } else {
        TRAINING_HISTORY.push(record);
      }
      // Keep at most 50 records
      if (TRAINING_HISTORY.length > 50) TRAINING_HISTORY.shift();
      saveTrainingHistory();
      buildAnalyticsData();
      this._renderRecords(TRAINING_HISTORY);
      this._renderWeaknessList();
      if (this.dashboard.chartsManager && this.dashboard.chartsManager.initialized) {
        this.dashboard.chartsManager.refreshAll();
      }
      // Flash the Records tab indicator
      const badge = document.querySelector('.tab-btn[data-tab="records"] .tab-badge');
      if (badge) {
        badge.style.display = 'inline-block';
        badge.textContent = 'NEW';
        setTimeout(() => { badge.style.display = 'none'; }, 3000);
      }
    };

    // Bind tabs
    this._bindTabNav();

    // Bind BLE buttons
    this._bindBLEUI();

    // Bind YOLO buttons
    this._bindYoloUI();

    // Bind language switcher
    this._bindLangSwitch();
    this._bindLogout();

    // Bind theme toggle
    this._bindThemeToggle();

    // FitNutrify open external button
    this._bindFitnutrify();

    // Listen for i18n changes to re-render dynamic content
    window.addEventListener('langChanged', () => {
      this._onLangChanged();
    });

    // Bind record filters
    this._bindClearHistory();
    this._bindRecordFilters();

    // Build chart analytics data from history (empty on first load)
    buildAnalyticsData();

    // Render static content
    this._renderRecords(TRAINING_HISTORY);
    this._renderWeaknessList();

    // Time display
    this._updateTime();
    setInterval(() => this._updateTime(), 1000);
  }

  // ─── Tab Navigation ───
  _bindTabNav() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        const target = document.getElementById(`tab-${tabId}`);
        if (target) target.classList.add('active');
        this.currentTab = tabId;

        if (tabId === 'analysis' || tabId === 'heartrate') {
          this.dashboard.chartsManager.init();
        }
        if (tabId === 'aicoach') {
          if (!this.aiCoach) {
            this.aiCoach = new AICoachModule();
            this.aiCoach.init();
          }
        }
        if (tabId === 'heartrate') {
          const hrData = this.dashboard.source.getHeartRateData();
          this.dashboard._updateHRDisplay(hrData);
          if (this.dashboard.chartsManager.initialized) {
            const hrHist = this.dashboard.source.sim.hrHistory.length > 0
              ? this.dashboard.source.sim.hrHistory
              : this.dashboard.source.ble.heartRateHistory;
            this.dashboard.chartsManager.updateHRChart(hrHist);
          }
        }
      });
    });
  }

  // ─── BLE Connection UI ───
  _bindBLEUI() {
    const btnConnect = document.getElementById('btnBLEConnect');
    const btnDisconnect = document.getElementById('btnBLEDisconnect');
    const btnConfig = document.getElementById('btnBLEConfig');
    const statusEl = document.getElementById('bleStatus');
    const pill = document.getElementById('blePill');
    const badge = document.getElementById('dataSourceBadge');

    if (!btnConnect) return;

    // Load saved BLE UUIDs
    const savedUUIDs = localStorage.getItem('smartlift_ble_uuids');
    if (savedUUIDs) {
      try { this.dashboard.source.ble.setUUIDs(JSON.parse(savedUUIDs)); } catch (e) {}
    }

    this.dashboard.source.ble.onStatusChange = (info) => {
      const statusText = t(`bt.status_${info.status}`) || info.status;
      if (statusEl) statusEl.textContent = info.status === 'ready' ? `${info.deviceName} ✓` : statusText;
      if (pill) {
        const dot = pill.querySelector('.pill-dot');
        if (dot) dot.className = 'pill-dot ' + (info.status === 'ready' || info.status === 'connected' ? 'connected' : info.status === 'connecting' ? 'connecting' : 'disconnected');
        const text = pill.querySelector('span:last-child');
        if (text) text.textContent = info.status === 'ready' ? info.deviceName || t('bt.connected') : statusText;
      }
      // Update data source badge
      if (badge && info.status === 'ready') {
        this.dashboard.source.useBLE = true;
        this._updateSourceBadge();
      }
      if (info.status === 'disconnected') {
        this.dashboard.source.useBLE = false;
        this._updateSourceBadge();
      }
    };

    btnConnect.addEventListener('click', async () => {
      try {
        btnConnect.style.display = 'none';
        if (statusEl) statusEl.textContent = t('bt.connecting');
        await this.dashboard.source.connectBLE();
        btnDisconnect.style.display = 'flex';
      } catch (err) {
        btnConnect.style.display = 'flex';
        if (statusEl) statusEl.textContent = err.message;
        if (err.message.includes('not supported')) {
          if (statusEl) statusEl.textContent = t('bt.not_supported');
        }
      }
    });

    btnDisconnect.addEventListener('click', async () => {
      await this.dashboard.source.disconnectBLE();
      btnDisconnect.style.display = 'none';
      btnConnect.style.display = 'flex';
      this.dashboard.source.useBLE = false;
      this._updateSourceBadge();
    });

    // Config modal
    btnConfig.addEventListener('click', () => {
      const modal = document.getElementById('bleConfigModal');
      if (!modal) return;
      const isOpen = modal.style.display === 'flex';
      modal.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) {
        document.getElementById('bleServiceUUID').value = BLE_CONFIG.serviceUUID;
        document.getElementById('bleHRUUID').value = BLE_CONFIG.characteristics.heartRate;
        document.getElementById('bleAccelUUID').value = BLE_CONFIG.characteristics.accelerometer;
      }
    });

    document.getElementById('btnBLESave').addEventListener('click', () => {
      const config = {
        serviceUUID: document.getElementById('bleServiceUUID').value,
        characteristics: {
          heartRate: document.getElementById('bleHRUUID').value,
          accelerometer: document.getElementById('bleAccelUUID').value
        }
      };
      localStorage.setItem('smartlift_ble_uuids', JSON.stringify(config));
      this.dashboard.source.ble.setUUIDs(config);
      document.getElementById('bleConfigModal').style.display = 'none';
    });

    document.getElementById('btnBLEReset').addEventListener('click', () => {
      localStorage.removeItem('smartlift_ble_uuids');
      this.dashboard.source.ble.setUUIDs({ ...BLE_CONFIG });
      document.getElementById('bleServiceUUID').value = BLE_CONFIG.serviceUUID;
      document.getElementById('bleHRUUID').value = BLE_CONFIG.characteristics.heartRate;
      document.getElementById('bleAccelUUID').value = BLE_CONFIG.characteristics.accelerometer;
    });
  }

  // ─── YOLO Connection UI ───
  _bindYoloUI() {
    const btnConnect = document.getElementById('btnYoloConnect');
    const btnDisconnect = document.getElementById('btnYoloDisconnect');
    const btnConfig = document.getElementById('btnYoloConfig');
    const statusEl = document.getElementById('yoloStatus');
    const pill = document.getElementById('yoloPill');
    const badge = document.getElementById('dataSourceBadge');

    if (!btnConnect) return;

    // Load saved URL
    const savedUrl = localStorage.getItem('smartlift_yolo_url');
    if (savedUrl) this.dashboard.source.yolo.setServerUrl(savedUrl);

    this.dashboard.source.yolo.onStatusChange = (info) => {
      if (statusEl) statusEl.textContent = info.status === 'ready' ? `✓ FPS:${this.dashboard.source.yolo.fps}` : info.message || info.status;
      if (pill) {
        const dot = pill.querySelector('.pill-dot');
        if (dot) dot.className = 'pill-dot ' + (info.status === 'ready' ? 'connected' : info.status === 'connecting' ? 'connecting' : 'disconnected');
        const text = pill.querySelector('span:last-child');
        if (text) text.textContent = info.status === 'ready' ? 'YOLO ✓' : info.message || t('yolo.disconnected');
      }
      if (badge && info.status === 'ready') {
        this.dashboard.source.useYOLO = true;
        this._updateSourceBadge();
        // Enable camera feed
        this._enableCameraFeed();
      }
      if (info.status === 'disconnected' || info.status === 'error') {
        this.dashboard.source.useYOLO = false;
        this._updateSourceBadge();
        // Disable camera feed
        this._disableCameraFeed();
      }
    };

    btnConnect.addEventListener('click', async () => {
      try {
        btnConnect.style.display = 'none';
        if (statusEl) statusEl.textContent = t('yolo.connecting');
        await this.dashboard.source.connectYOLO();
        btnDisconnect.style.display = 'flex';
      } catch (err) {
        btnConnect.style.display = 'flex';
        if (statusEl) statusEl.textContent = err.message;
      }
    });

    btnDisconnect.addEventListener('click', async () => {
      await this.dashboard.source.disconnectYOLO();
      btnDisconnect.style.display = 'none';
      btnConnect.style.display = 'flex';
      this.dashboard.source.useYOLO = false;
      this._updateSourceBadge();
      this._disableCameraFeed();
    });

    btnConfig.addEventListener('click', () => {
      const modal = document.getElementById('yoloConfigModal');
      if (!modal) return;
      const isOpen = modal.style.display === 'flex';
      modal.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) {
        document.getElementById('yoloServerUrl').value = this.dashboard.source.yolo.serverUrl;
      }
    });

    document.getElementById('btnYoloSave').addEventListener('click', () => {
      const url = document.getElementById('yoloServerUrl').value;
      localStorage.setItem('smartlift_yolo_url', url);
      this.dashboard.source.yolo.setServerUrl(url);
      document.getElementById('yoloConfigModal').style.display = 'none';
    });
  }

  // ─── Theme ───
  _applyTheme() {
    const saved = localStorage.getItem('smartlift_theme');
    const isLight = saved === 'light';
    if (isLight) document.body.classList.add('light-theme');
    this._updateThemeIcon(isLight);
  }

  _bindThemeToggle() {
    document.getElementById('themeToggle').addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      localStorage.setItem('smartlift_theme', isLight ? 'light' : 'dark');
      this._updateThemeIcon(isLight);
    });
  }

  _updateThemeIcon(isLight) {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = isLight ? '☀️' : '🌙';
  }

  // ─── FitNutrify ───
  _bindFitnutrify() {
    const btn = document.getElementById('btnOpenFitnutrify');
    if (btn) {
      btn.addEventListener('click', () => {
        window.open('https://fitnutrify-a0415e13.base44.app', '_blank');
      });
    }
  }

  // ─── Language ───
  _bindLangSwitch() {
    document.getElementById('langSwitch').addEventListener('click', () => {
      const newLang = CURRENT_LANG === 'zh' ? 'en' : 'zh';
      setLang(newLang);
    });
  }

  _onLangChanged() {
    // Re-render dynamic content with new language
    this._renderRecords(TRAINING_HISTORY);
    this._renderWeaknessList();
    // Re-apply exercise button text
    applyI18n();
    // Update HR zone labels
    const zones = t('hr.zones');
    if (Array.isArray(zones)) {
      document.querySelectorAll('#hrZoneLabels span').forEach((span, i) => {
        if (zones[i]) span.textContent = zones[i];
      });
    }
  }

  _updateSourceBadge() {
    const badge = document.getElementById('dataSourceBadge');
    if (!badge) return;
    const hasLive = this.dashboard.source.useBLE || this.dashboard.source.useYOLO;
    badge.className = 'data-source-badge ' + (hasLive ? 'live' : 'sim');
    const span = badge.querySelector('span');
    if (span) {
      span.setAttribute('data-i18n', hasLive ? 'dash.source_live' : 'dash.source_sim');
      span.textContent = t(hasLive ? 'dash.source_live' : 'dash.source_sim');
    }
  }

  _enableCameraFeed() {
    const img = document.getElementById('cameraFeed');
    const placeholder = document.getElementById('cameraPlaceholder');
    const statusEl = document.getElementById('cameraStatus');
    if (!img || !placeholder) return;
    // Derive video URL from WebSocket URL
    const wsUrl = this.dashboard.source.yolo.serverUrl;
    const videoUrl = wsUrl.replace('ws://', 'http://').replace('/ws', '/video');
    img.src = videoUrl;
    img.style.display = 'block';
    placeholder.style.display = 'none';
    if (statusEl) { statusEl.textContent = 'LIVE'; statusEl.className = 'viz-badge success'; }
  }

  _disableCameraFeed() {
    const img = document.getElementById('cameraFeed');
    const placeholder = document.getElementById('cameraPlaceholder');
    const statusEl = document.getElementById('cameraStatus');
    if (!img || !placeholder) return;
    img.src = '';
    img.style.display = 'none';
    placeholder.style.display = 'block';
    if (statusEl) { statusEl.textContent = 'OFF'; statusEl.className = 'viz-badge'; }
  }

  // ─── Records ───
  _bindLogout() {
    const btn = document.getElementById('btnLogout');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (confirm(t('nav.logout_confirm') || '确定退出登录吗？')) {
        localStorage.removeItem('smartlift_user');
        window.location.href = 'login.html';
      }
    });
  }

  _bindClearHistory() {
    const btn = document.getElementById('btnClearHistory');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (confirm(t('records.clear_confirm') || '确定清除所有训练记录吗？此操作不可恢复。')) {
        TRAINING_HISTORY.length = 0;
        saveTrainingHistory();
        buildAnalyticsData();
        this._renderRecords(TRAINING_HISTORY);
        // Refresh analysis charts to reflect empty data
        if (this.dashboard.chartsManager.initialized) {
          this.dashboard.chartsManager.refreshAll();
        }
      }
    });
  }

  _bindRecordFilters() {
    const filterEx = document.getElementById('filterExercise');
    const filterPeriod = document.getElementById('filterPeriod');
    const apply = () => {
      let filtered = [...TRAINING_HISTORY];
      if (filterEx && filterEx.value !== 'all') filtered = filtered.filter(r => r.exercise === filterEx.value);
      if (filterPeriod && filterPeriod.value === 'week') filtered = filtered.slice(0, 5);
      this._renderRecords(filtered);
    };
    if (filterEx) filterEx.addEventListener('change', apply);
    if (filterPeriod) filterPeriod.addEventListener('change', apply);
  }

  _renderRecords(records) {
    const container = document.getElementById('recordsList');
    if (!container) return;
    if (records.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">` +
        `<div style="font-size:48px;margin-bottom:12px">📋</div>` +
        `<div>${t('records.empty')}</div></div>`;
      return;
    }
    const names = { squat: t('ex.squat'), bench: t('ex.bench'), deadlift: t('ex.deadlift'), ohp: t('ex.ohp') };
    const colors = { '优秀': 'var(--accent)', '良好': 'var(--accent)', '一般': 'var(--warning)', 'Excellent': 'var(--accent)', 'Good': 'var(--accent)', 'Fair': 'var(--warning)' };
    container.innerHTML = records.map(r => `
      <div class="record-card">
        <div class="record-date"><div class="day">${r.day}</div><div class="month">${r.month}</div></div>
        <div class="record-exercise">${names[r.exercise] || r.exercise}</div>
        <div class="record-details">
          <div class="record-detail"><span class="rd-label">${t('records.sets')}</span><span class="rd-value">${r.sets}</span></div>
          <div class="record-detail"><span class="rd-label">${t('records.reps')}</span><span class="rd-value">${r.reps}</span></div>
          <div class="record-detail"><span class="rd-label">${t('records.weight')}</span><span class="rd-value">${r.weight} ${t('records.kg')}</span></div>
        </div>
        <div class="record-score">
          <div class="score-num" style="color:${colors[r.scoreLabel] || 'var(--accent)'}">${r.score}</div>
          <div class="score-label">${t(`score.${r.scoreLabel === '优秀' ? 'excellent' : r.scoreLabel === '良好' ? 'good' : 'fair'}`)}</div>
        </div>
        <div class="record-arrow">→</div>
      </div>
    `).join('');
  }

  _renderWeaknessList() {
    const container = document.getElementById('weaknessList');
    if (!container) return;

    if (!TRAINING_HISTORY.length) {
      container.innerHTML = `<div class="weakness-item" style="opacity:0.5;text-align:center;padding:2rem 1rem;">
        <p>${t('records.empty') || '暂无训练数据，开始训练后将基于动作分析生成个性化改进建议'}</p>
      </div>`;
      return;
    }

    const items = [
      { icon: '⚠', exercise: t('ex.deadlift'), issue: t('weakness.dl_back'), suggestion: t('weakness.dl_sugg') },
      { icon: '⚠', exercise: t('ex.bench'), issue: t('weakness.bp_symmetry'), suggestion: t('weakness.bp_sugg') },
      { icon: 'ℹ', exercise: t('ex.squat'), issue: t('weakness.sq_bar'), suggestion: t('weakness.sq_sugg') }
    ];
    container.innerHTML = items.map(w => `
      <div class="weakness-item">
        <span class="weakness-icon">${w.icon}</span>
        <div class="weakness-content">
          <h4>${w.exercise} — ${w.issue}</h4>
          <p>${w.suggestion}</p>
        </div>
      </div>
    `).join('');
  }

  _updateTime() {
    const now = new Date();
    const el = document.getElementById('deviceTime');
    if (el) el.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' +
      now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}

// ─── Boot ───
document.addEventListener('DOMContentLoaded', () => {
  window.__app = new App();
  window.__app.init();
});
