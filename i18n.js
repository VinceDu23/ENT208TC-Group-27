/* ============================================
   i18n.js — Internationalization System (ZH/EN)
   ============================================ */

const I18N_LANGS = {
  zh: {
    // Nav
    'app.title': 'FitVision',
    'app.subtitle': '智能力量训练助手',
    'nav.training': '实时追踪',
    'nav.records': '训练记录',
    'nav.analysis': '数据分析',
    'nav.heartrate': '心率监测',
    'nav.aicoach': 'AI教练',
    'nav.fitnutrify': 'FitNutrify',
    'nav.logout': '退出',
    'nav.logout_confirm': '确定退出登录吗？',

    // Bluetooth
    'bt.connected': '已连接',
    'bt.disconnected': '断连中...',
    'bt.connecting': '连接中...',
    'bt.connect': '连接设备',
    'bt.disconnect': '断开设备',
    'bt.scanning': '扫描设备...',
    'bt.not_supported': '浏览器不支持蓝牙',
    'bt.status_ready': '设备就绪',
    'bt.status_connecting': '正在连接',
    'bt.status_connected': '已连接',
    'bt.status_disconnected': '已断开',
    'bt.status_error': '连接错误',
    'bt.config_title': 'BLE UUID 配置',
    'bt.config_service': 'Service UUID',
    'bt.config_hr': '心率 Characteristic',
    'bt.config_accel': '加速度 Characteristic',
    'bt.config_save': '保存配置',
    'bt.config_reset': '恢复默认',

    // YOLO
    'yolo.connect': '连接YOLO',
    'yolo.disconnect': '断开YOLO',
    'yolo.connected': '已连接',
    'yolo.disconnected': '未连接',
    'yolo.connecting': '连接中...',
    'yolo.error': '连接失败',
    'yolo.config_title': 'YOLO 服务器配置',
    'yolo.config_url': '服务器地址',
    'yolo.config_save': '保存',
    'yolo.status': 'FPS',

    // Dashboard
    'dash.exercise': '动作',
    'dash.sets': '组数',
    'dash.reps': '次数',
    'dash.start': '开始训练',
    'dash.pause': '暂停',
    'dash.reset': '重置',
    'dash.save_record': '💾 记录数据',
    'dash.bar_trajectory': '杠铃轨迹',
    'dash.pose_analysis': '姿势分析',
    'dash.live_data': '实时数据',
    'dash.ideal_path': '理想轨迹',
    'dash.actual_path': '实际轨迹',
    'dash.top': '顶部',
    'dash.bottom': '底部',
    'dash.source_sim': '模拟模式',
    'dash.source_live': '实时模式',

    // Metrics
    'metric.hip': '髋角',
    'metric.knee': '膝角',
    'metric.trunk': '躯干角',
    'metric.shoulder': '肩角',
    'metric.speed': '动作速度',
    'metric.deviation': '杠铃偏移',
    'metric.ankle': '踝角',
    'metric.elbow': '肘角',

    // Exercises
    'ex.squat': '深蹲',
    'ex.bench': '卧推',
    'ex.deadlift': '硬拉',
    'ex.ohp': '肩推',

    // Heart Rate
    'hr.title': '心率监测',
    'hr.current': '当前心率',
    'hr.bpm': 'bpm',
    'hr.max_percent': 'HRmax',
    'hr.zone': '心率区间',
    'hr.training_time': '训练时长',
    'hr.avg_hr': '平均心率',
    'hr.max_hr': '最高心率',
    'hr.calories': '估算消耗',
    'hr.recovery': '恢复状态',
    'hr.recovery_good': '良好',
    'hr.recovery_recovering': '恢复中...',
    'hr.waiting': '等待数据...',
    'hr.zones': ['热身', '燃脂', '有氧', '高强度', '极限'],

    // Analysis
    'analysis.score_trend': '姿势评分趋势',
    'analysis.score_trend_sub': '近 7 次训练',
    'analysis.volume': '训练量统计',
    'analysis.volume_sub': '本月累计',
    'analysis.compare': '动作评分对比',
    'analysis.compare_sub': '当前 vs 上次',
    'analysis.weakness': '弱点分析与建议',
    'analysis.dim_trajectory': '轨迹',
    'analysis.dim_posture': '姿势',
    'analysis.dim_symmetry': '对称',
    'analysis.dim_control': '控制',

    // Records
    'records.title': '训练记录',
    'records.filter_exercise': '全部动作',
    'records.filter_period': '全部时间',
    'records.filter_week': '本周',
    'records.filter_month': '本月',
    'records.empty': '暂无训练记录',
    'records.clear_confirm': '确定清除所有训练记录吗？此操作不可恢复。',
    'records.clear': '清除记录',
    'records.sets': '组数',
    'records.reps': '次数',
    'records.weight': '重量',
    'records.kg': 'kg',

    // Scores
    'score.excellent': '优秀',
    'score.good': '良好',
    'score.fair': '一般',
    'score.poor': '需改进',

    // Alerts
    'alert.knee_valgus': '膝盖内扣，注意膝盖方向应与脚尖一致',
    'alert.forward_lean': '躯干前倾过多，请保持胸部挺起，收紧核心',
    'alert.heel_lift': '脚跟离地，重心后移，踩实地面',
    'alert.bar_forward': '杠铃轨迹前移，请保持杠铃在脚中心正上方',
    'alert.bar_asymmetry': '杠铃左右不平衡，请保持杠铃水平',
    'alert.shoulder_protraction': '肩部前伸，请收紧肩胛骨保持稳定',
    'alert.elbow_flare': '肘部过度外展，建议保持 45-75° 夹角',
    'alert.back_rounding': '腰背弯曲！立即降低重量，保持脊柱中立',
    'alert.bar_away': '杠铃远离身体，请将杠铃贴近小腿',
    'alert.hip_rise': '过早抬臀，请保持肩髋同步上升',
    'alert.arch_back': '过度弓腰，收紧核心，避免躯干后仰',

    // Weakness suggestions
    'weakness.dl_back': '腰背稳定性不足',
    'weakness.dl_sugg': '建议加入罗马尼亚硬拉（RDL）和猫牛式练习，每周 2 次。当前重量建议降低 10%，专注脊柱中立姿势。',
    'weakness.bp_symmetry': '杠铃左右对称性偏差',
    'weakness.bp_sugg': '可能存在右侧主导发力倾向。建议加入单侧哑铃卧推和地板卧推，强化弱势侧稳定性。',
    'weakness.sq_bar': '底部杠铃轨迹轻微前移',
    'weakness.sq_sugg': '核心稳定性可继续加强。建议加入前蹲和暂停深蹲练习，改善底部位置的身体控制。',

    // Lang
    'lang.switch': 'EN',

    // AI Coach
    'aicoach.title': 'AI 健身教练',
    'aicoach.welcome_title': '你好，我是你的 AI 健身教练',
    'aicoach.welcome_text': '我可以帮你分析训练数据、制定计划、解答动作疑问。配置 API 后即可开始对话。',
    'aicoach.quick': '快捷提问：',
    'aicoach.thinking': 'AI 思考中...',
    'aicoach.placeholder': '输入你的问题...',
    'aicoach.send': '发送',
    'aicoach.clear_chat': '清除对话',
    'aicoach.export_chat': '导出对话',
    'aicoach.api_config': 'API 配置',
    'aicoach.api_endpoint': 'Endpoint',
    'aicoach.api_key': 'API Key',
    'aicoach.model': 'Model',
    'aicoach.temperature': 'Temperature',
    'aicoach.max_tokens': 'Max Tokens',
    'aicoach.save_config': '保存配置',
    'aicoach.test_conn': '测试连接',
    'aicoach.system_prompt': 'System Prompt 设定',
    'aicoach.reset_prompt': '恢复默认',
    'aicoach.context_title': '训练上下文注入',
    'aicoach.context_hint': '开启后会将你的最新训练数据附在 Prompt 中，AI 可据此给出个性化建议。',
    'aicoach.inject_context': '📊 注入当前训练数据',

    // FitNutrify
    'fitnutrify.subtitle': '营养与饮食管理',
    'fitnutrify.open_external': '🔗 在新窗口打开',

    // Tutorial
    'tutorial.title': '动作教程',
    'tutorial.analysis': '动作分析',
    'tutorial.target_muscles': '目标肌群',
    'tutorial.steps': '动作步骤',
    'tutorial.mistakes': '常见错误',
    'tutorial.close': '关闭',
    'tutorial.gif_loading': '动图加载中...',
  },

  en: {
    'app.title': 'FitVision',
    'app.subtitle': 'Intelligent Strength Training',
    'nav.training': 'Live Tracking',
    'nav.records': 'Records',
    'nav.analysis': 'Analysis',
    'nav.heartrate': 'Heart Rate',
    'nav.aicoach': 'AI Coach',
    'nav.fitnutrify': 'FitNutrify',
    'nav.logout': 'Logout',
    'nav.logout_confirm': 'Are you sure you want to logout?',

    'bt.connected': 'Connected',
    'bt.disconnected': 'Disconnected',
    'bt.connecting': 'Connecting...',
    'bt.connect': 'Connect Device',
    'bt.disconnect': 'Disconnect',
    'bt.scanning': 'Scanning...',
    'bt.not_supported': 'Bluetooth not supported',
    'bt.status_ready': 'Device Ready',
    'bt.status_connecting': 'Connecting',
    'bt.status_connected': 'Connected',
    'bt.status_disconnected': 'Disconnected',
    'bt.status_error': 'Error',
    'bt.config_title': 'BLE UUID Config',
    'bt.config_service': 'Service UUID',
    'bt.config_hr': 'HR Characteristic',
    'bt.config_accel': 'Accel Characteristic',
    'bt.config_save': 'Save',
    'bt.config_reset': 'Reset Default',

    'yolo.connect': 'Connect YOLO',
    'yolo.disconnect': 'Disconnect YOLO',
    'yolo.connected': 'Connected',
    'yolo.disconnected': 'Disconnected',
    'yolo.connecting': 'Connecting...',
    'yolo.error': 'Error',
    'yolo.config_title': 'YOLO Server Config',
    'yolo.config_url': 'Server URL',
    'yolo.config_save': 'Save',
    'yolo.status': 'FPS',

    'dash.exercise': 'Exercise',
    'dash.sets': 'Sets',
    'dash.reps': 'Reps',
    'dash.start': 'Start Training',
    'dash.pause': 'Pause',
    'dash.reset': 'Reset',
    'dash.save_record': '💾 Save Record',
    'dash.bar_trajectory': 'Bar Trajectory',
    'dash.pose_analysis': 'Pose Analysis',
    'dash.live_data': 'Live Data',
    'dash.ideal_path': 'Ideal Path',
    'dash.actual_path': 'Actual Path',
    'dash.top': 'Top',
    'dash.bottom': 'Bottom',
    'dash.source_sim': 'Simulation',
    'dash.source_live': 'Live',

    'metric.hip': 'Hip',
    'metric.knee': 'Knee',
    'metric.trunk': 'Trunk',
    'metric.shoulder': 'Shoulder',
    'metric.speed': 'Speed',
    'metric.deviation': 'Deviation',
    'metric.ankle': 'Ankle',
    'metric.elbow': 'Elbow',

    'ex.squat': 'Squat',
    'ex.bench': 'Bench Press',
    'ex.deadlift': 'Deadlift',
    'ex.ohp': 'OH Press',

    'hr.title': 'Heart Rate',
    'hr.current': 'Current HR',
    'hr.bpm': 'bpm',
    'hr.max_percent': 'HRmax',
    'hr.zone': 'Zone',
    'hr.training_time': 'Duration',
    'hr.avg_hr': 'Avg HR',
    'hr.max_hr': 'Max HR',
    'hr.calories': 'Est. Calories',
    'hr.recovery': 'Recovery',
    'hr.recovery_good': 'Good',
    'hr.recovery_recovering': 'Recovering...',
    'hr.waiting': 'Waiting...',
    'hr.zones': ['Warmup', 'Fat Burn', 'Aerobic', 'Intense', 'Max'],

    'analysis.score_trend': 'Posture Score Trend',
    'analysis.score_trend_sub': 'Last 7 Sessions',
    'analysis.volume': 'Training Volume',
    'analysis.volume_sub': 'This Month',
    'analysis.compare': 'Session Comparison',
    'analysis.compare_sub': 'Current vs Previous',
    'analysis.weakness': 'Weakness Analysis',
    'analysis.dim_trajectory': 'Trajectory',
    'analysis.dim_posture': 'Posture',
    'analysis.dim_symmetry': 'Symmetry',
    'analysis.dim_control': 'Control',

    'records.title': 'Training Records',
    'records.filter_exercise': 'All Exercises',
    'records.filter_period': 'All Time',
    'records.filter_week': 'This Week',
    'records.filter_month': 'This Month',
    'records.empty': 'No Records Yet',
    'records.clear_confirm': 'Are you sure you want to delete all records? This cannot be undone.',
    'records.clear': 'Clear Records',
    'records.sets': 'Sets',
    'records.reps': 'Reps',
    'records.weight': 'Weight',
    'records.kg': 'kg',

    'score.excellent': 'Excellent',
    'score.good': 'Good',
    'score.fair': 'Fair',
    'score.poor': 'Needs Work',

    'alert.knee_valgus': 'Knee valgus detected. Keep knees aligned with toes.',
    'alert.forward_lean': 'Excessive forward lean. Keep chest up, engage core.',
    'alert.heel_lift': 'Heels lifting off. Shift weight back, keep feet planted.',
    'alert.bar_forward': 'Bar path drifting forward. Keep bar over mid-foot.',
    'alert.bar_asymmetry': 'Bar uneven left/right. Keep barbell level.',
    'alert.shoulder_protraction': 'Shoulder protraction. Retract scapulae.',
    'alert.elbow_flare': 'Excessive elbow flare. Maintain 45-75° angle.',
    'alert.back_rounding': 'Back rounding! Lower weight, maintain neutral spine.',
    'alert.bar_away': 'Bar drifting away. Keep bar close to shins.',
    'alert.hip_rise': 'Hips rising early. Keep shoulders and hips synchronized.',
    'alert.arch_back': 'Excessive back arch. Engage core, avoid leaning back.',

    'weakness.dl_back': 'Lower Back Instability',
    'weakness.dl_sugg': 'Add Romanian deadlifts (RDL) and cat-cow stretches 2x/week. Reduce weight 10% and focus on neutral spine.',
    'weakness.bp_symmetry': 'Barbell Asymmetry',
    'weakness.bp_sugg': 'Possible right-side dominance. Add unilateral dumbbell press and floor press to strengthen the weaker side.',
    'weakness.sq_bar': 'Bar Path Forward Drift',
    'weakness.sq_sugg': 'Core stability needs improvement. Add front squats and pause squats to improve bottom position control.',

    'lang.switch': '中文',

    // AI Coach
    'aicoach.title': 'AI Coach',
    'aicoach.welcome_title': "Hi, I'm your AI fitness coach",
    'aicoach.welcome_text': 'I can analyze your training data, design workout plans, and answer exercise questions. Configure your API key to get started.',
    'aicoach.quick': 'Quick ask:',
    'aicoach.thinking': 'Thinking...',
    'aicoach.placeholder': 'Ask anything about fitness...',
    'aicoach.send': 'Send',
    'aicoach.clear_chat': 'Clear Chat',
    'aicoach.export_chat': 'Export Chat',
    'aicoach.api_config': 'API Config',
    'aicoach.api_endpoint': 'Endpoint',
    'aicoach.api_key': 'API Key',
    'aicoach.model': 'Model',
    'aicoach.temperature': 'Temperature',
    'aicoach.max_tokens': 'Max Tokens',
    'aicoach.save_config': 'Save Config',
    'aicoach.test_conn': 'Test Connection',
    'aicoach.system_prompt': 'System Prompt',
    'aicoach.reset_prompt': 'Reset Default',
    'aicoach.context_title': 'Training Context',
    'aicoach.context_hint': 'When enabled, your latest training data will be included in the prompt for personalized advice.',
    'aicoach.inject_context': '📊 Inject Training Data',

    // FitNutrify
    'fitnutrify.subtitle': 'Nutrition & Diet Management',
    'fitnutrify.open_external': '🔗 Open in New Window',

    // Tutorial
    'tutorial.title': 'Exercise Tutorial',
    'tutorial.analysis': 'Analysis',
    'tutorial.target_muscles': 'Target Muscles',
    'tutorial.steps': 'Step-by-Step',
    'tutorial.mistakes': 'Common Mistakes',
    'tutorial.close': 'Close',
    'tutorial.gif_loading': 'Loading GIF...',
  }
};

let CURRENT_LANG = localStorage.getItem('smartlift_lang') || 'zh';

function t(key) {
  return I18N_LANGS[CURRENT_LANG][key] || I18N_LANGS['zh'][key] || key;
}

function setLang(lang) {
  CURRENT_LANG = lang;
  localStorage.setItem('smartlift_lang', lang);
  applyI18n();
}

function applyI18n() {
  // Update all [data-i18n] elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text) el.textContent = text;
  });

  // Update all [data-i18n-placeholder]
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = t(key);
    if (text) el.setAttribute('placeholder', text);
  });

  // Update lang switch button
  const langBtn = document.getElementById('langSwitch');
  if (langBtn) langBtn.textContent = t('lang.switch');

  // Trigger custom event for dynamic content
  window.dispatchEvent(new CustomEvent('langChanged', { detail: { lang: CURRENT_LANG } }));
}

function getCurrentLang() { return CURRENT_LANG; }
