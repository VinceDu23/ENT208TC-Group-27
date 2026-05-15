/* ============================================
   data.js — 静态配置数据与历史记录
   ============================================ */

// 各动作的理想参数配置
const EXERCISE_CONFIG = {
  squat: {
    name: '深蹲',
    icon: '🏋️',
    // 理想关节角度范围 [min, max]
    repDetection: {
      method: 'bar_y',
      topRange: [0.60, 0.95],       // normalized bar_y for standing position
      bottomRange: [0.08, 0.50],    // normalized bar_y for bottom position
      primaryAngle: 'knee',          // verify with knee angle
      angleTopRange: [155, 180],    // standing knee ~170°
      angleBottomRange: [65, 105],  // squat knee ~85°
      minRepInterval: 800,          // ms minimum between reps
      smoothWindow: 5               // moving average window for bar_y
    },
    ideal: {
      hip: [85, 100],
      knee: [80, 95],
      trunk: [30, 50],
      shoulder: [70, 90],
      ankle: [65, 80]
    },
    // 理想杠铃轨迹：侧面看近乎垂直直线
    idealTrajectory: [
      { x: 0.5, y: 0.85 },  // 顶部
      { x: 0.5, y: 0.70 },
      { x: 0.48, y: 0.50 },
      { x: 0.45, y: 0.30 },
      { x: 0.43, y: 0.18 },  // 底部
      { x: 0.45, y: 0.30 },
      { x: 0.48, y: 0.50 },
      { x: 0.50, y: 0.70 },
      { x: 0.5, y: 0.85 }    // 回到顶部
    ],
    // 常见错误
    errors: [
      { key: 'knee_valgus', text: '膝盖内扣，注意膝盖方向应与脚尖一致', threshold: 0.15 },
      { key: 'forward_lean', text: '躯干前倾过多，请保持胸部挺起，收紧核心', threshold: 0.12 },
      { key: 'heel_lift', text: '脚跟离地，重心后移，踩实地面', threshold: 0.1 },
      { key: 'bar_forward', text: '杠铃轨迹前移，请保持杠铃在脚中心正上方', threshold: 0.08 }
    ]
  },
  bench: {
    name: '卧推',
    icon: '🏋️',
    repDetection: {
      method: 'bar_y',
      topRange: [0.60, 0.95],
      bottomRange: [0.08, 0.50],
      primaryAngle: 'elbow',
      angleTopRange: [155, 180],
      angleBottomRange: [60, 105],
      minRepInterval: 800,
      smoothWindow: 5
    },
    ideal: {
      hip: [160, 180],
      knee: [70, 90],
      trunk: [0, 5],
      shoulder: [80, 100],
      elbow: [75, 95]
    },
    idealTrajectory: [
      { x: 0.5, y: 0.85 },
      { x: 0.48, y: 0.70 },
      { x: 0.45, y: 0.50 },
      { x: 0.42, y: 0.30 },
      { x: 0.40, y: 0.15 },
      { x: 0.42, y: 0.30 },
      { x: 0.45, y: 0.50 },
      { x: 0.48, y: 0.70 },
      { x: 0.5, y: 0.85 }
    ],
    errors: [
      { key: 'bar_asymmetry', text: '杠铃左右不平衡，请保持杠铃水平', threshold: 0.1 },
      { key: 'shoulder_protraction', text: '肩部前伸，请收紧肩胛骨保持稳定', threshold: 0.1 },
      { key: 'elbow_flare', text: '肘部过度外展，建议保持 45-75° 夹角', threshold: 0.12 }
    ]
  },
  deadlift: {
    name: '硬拉',
    icon: '🏋️',
    repDetection: {
      method: 'bar_y',
      topRange: [0.60, 0.95],
      bottomRange: [0.08, 0.50],
      primaryAngle: 'hip',
      angleTopRange: [160, 180],
      angleBottomRange: [120, 155],
      minRepInterval: 800,
      smoothWindow: 5
    },
    ideal: {
      hip: [140, 180],
      knee: [130, 180],
      trunk: [0, 20],
      shoulder: [0, 30],
      spine: [165, 180]
    },
    idealTrajectory: [
      { x: 0.5, y: 0.88 },
      { x: 0.5, y: 0.75 },
      { x: 0.5, y: 0.60 },
      { x: 0.5, y: 0.45 },
      { x: 0.5, y: 0.30 },
      { x: 0.5, y: 0.15 },
      { x: 0.5, y: 0.30 },
      { x: 0.5, y: 0.45 },
      { x: 0.5, y: 0.60 },
      { x: 0.5, y: 0.75 },
      { x: 0.5, y: 0.88 }
    ],
    errors: [
      { key: 'back_rounding', text: '腰背弯曲！立即降低重量，保持脊柱中立', threshold: 0.08 },
      { key: 'bar_away', text: '杠铃远离身体，请将杠铃贴近小腿', threshold: 0.1 },
      { key: 'hip_rise', text: '过早抬臀，请保持肩髋同步上升', threshold: 0.12 }
    ]
  },
  ohp: {
    name: '肩推',
    icon: '🏋️',
    repDetection: {
      method: 'bar_y',
      topRange: [0.50, 0.85],
      bottomRange: [0.01, 0.28],
      primaryAngle: 'shoulder',
      angleTopRange: [155, 180],
      angleBottomRange: [0, 50],
      minRepInterval: 800,
      smoothWindow: 5
    },
    ideal: {
      hip: [165, 180],
      knee: [170, 180],
      trunk: [0, 10],
      shoulder: [150, 180],
      elbow: [0, 180]
    },
    idealTrajectory: [
      { x: 0.5, y: 0.70 },
      { x: 0.5, y: 0.55 },
      { x: 0.52, y: 0.35 },
      { x: 0.55, y: 0.18 },
      { x: 0.5, y: 0.08 },
      { x: 0.5, y: 0.18 },
      { x: 0.5, y: 0.35 },
      { x: 0.5, y: 0.55 },
      { x: 0.5, y: 0.70 }
    ],
    errors: [
      { key: 'arch_back', text: '过度弓腰，收紧核心，避免躯干后仰', threshold: 0.1 },
      { key: 'uneven_press', text: '杠铃左右不均，保持双侧同步发力', threshold: 0.1 },
      { key: 'head_forward', text: '头部前探，杠铃经过时自然收下巴', threshold: 0.08 }
    ]
  }
};

// 心率区间定义 (基于最大心率百分比)
const HR_ZONES = [
  { name: '热身', range: [50, 60], color: '#4a90d9' },
  { name: '燃脂', range: [60, 70], color: '#44cc88' },
  { name: '有氧', range: [70, 80], color: '#ffcc00' },
  { name: '高强度', range: [80, 90], color: '#ff8833' },
  { name: '极限', range: [90, 100], color: '#ff3344' }
];

// 历史训练记录（模拟数据）
const TRAINING_STORAGE_KEY = 'fitvision_training_history';

// 从 localStorage 加载训练历史，首次使用为空
let TRAINING_HISTORY = (function() {
  try {
    const saved = JSON.parse(localStorage.getItem(TRAINING_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (e) {}
  return [];
})();

function saveTrainingHistory() {
  try { localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(TRAINING_HISTORY)); } catch (e) {}
}

// 评分趋势数据（近 7 次训练，从 TRAINING_HISTORY 动态计算）
let TREND_DATA = { labels: [], squat: [], bench: [], deadlift: [], ohp: [], overall: [] };

// 训练量数据（从 TRAINING_HISTORY 动态计算）
let VOLUME_DATA = [];

// 动作对比数据（从 TRAINING_HISTORY 动态计算）
let COMPARE_DATA = { labels: ['轨迹', '姿势', '对称', '控制'], current: [], previous: [] };

/** 从 TRAINING_HISTORY 重建所有分析数据 */
function buildAnalyticsData() {
  const hist = TRAINING_HISTORY;
  if (!hist || hist.length === 0) {
    TREND_DATA = { labels: [], squat: [], bench: [], deadlift: [], ohp: [], overall: [] };
    VOLUME_DATA = [];
    COMPARE_DATA = { labels: ['轨迹', '姿势', '对称', '控制'], current: [], previous: [] };
    return;
  }

  const names = { squat: '深蹲', bench: '卧推', deadlift: '硬拉', ohp: '肩推' };
  const en = { squat: 'Squat', bench: 'Bench Press', deadlift: 'Deadlift', ohp: 'OH Press' };

  // ── TREND_DATA: 最近 7 个唯一训练日各动作平均分 ──
  const dateOrder = [];
  const seen = new Set();
  for (let i = hist.length - 1; i >= 0; i--) {
    const dk = `${hist[i].month}${hist[i].day}`;
    if (!seen.has(dk)) { seen.add(dk); dateOrder.unshift(dk); }
  }
  const last7 = dateOrder.slice(-7);
  const lang = getCurrentLang ? getCurrentLang() : 'zh';

  TREND_DATA = {
    labels: last7.map(d => d.replace('月', '/')),
    squat: [], bench: [], deadlift: [], ohp: [], overall: []
  };
  for (const dk of last7) {
    const dayRecs = hist.filter(r => `${r.month}${r.day}` === dk);
    const exScores = {};
    for (const r of dayRecs) {
      if (!exScores[r.exercise]) exScores[r.exercise] = [];
      exScores[r.exercise].push(r.score);
    }
    for (const ex of ['squat', 'bench', 'deadlift', 'ohp']) {
      TREND_DATA[ex].push(exScores[ex] ? Math.round(exScores[ex].reduce((a, b) => a + b, 0) / exScores[ex].length) : null);
    }
    const all = Object.values(exScores).flat();
    TREND_DATA.overall.push(all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null);
  }

  // ── VOLUME_DATA: 各动作总训练量（组数 × 次数 × 重量）──
  const exName = lang === 'en' ? en : names;
  const vols = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };
  for (const r of hist) {
    if (vols[r.exercise] !== undefined) {
      vols[r.exercise] += (r.sets || 0) * (r.reps || 0) * (r.weight || 0);
    }
  }
  VOLUME_DATA = Object.entries(vols).map(([ex, v]) => ({ exercise: exName[ex], volume: v }));

  // ── COMPARE_DATA: 最近两次训练日用平均分做雷达对比 ──
  if (last7.length >= 2) {
    const recent = last7[last7.length - 1];
    const previous = last7[last7.length - 2];
    const avgFor = (dk) => {
      const recs = hist.filter(r => `${r.month}${r.day}` === dk);
      return recs.length ? Math.round(recs.reduce((s, r) => s + r.score, 0) / recs.length) : 0;
    };
    const curAvg = avgFor(recent);
    const prevAvg = avgFor(previous);
    COMPARE_DATA = {
      labels: ['轨迹', '姿势', '对称', '控制'],
      current: [curAvg, curAvg, curAvg, curAvg],
      previous: [prevAvg, prevAvg, prevAvg, prevAvg]
    };
  } else if (last7.length === 1) {
    const avg = Math.round(hist.reduce((s, r) => s + r.score, 0) / hist.length);
    COMPARE_DATA = {
      labels: ['轨迹', '姿势', '对称', '控制'],
      current: [avg, avg, avg, avg],
      previous: []
    };
  } else {
    COMPARE_DATA = { labels: ['轨迹', '姿势', '对称', '控制'], current: [], previous: [] };
  }
}

// 动作教程数据
const EXERCISE_TUTORIALS = {
  squat: {
    name: '深蹲',
    nameEn: 'Squat',
    gif: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Squat.gif',
    analysis: '深蹲是力量训练的基石动作，主要锻炼股四头肌、臀大肌、腘绳肌和核心肌群。正确的深蹲能有效提升下肢力量、爆发力和整体运动表现。动作过程中，杠铃应置于斜方肌上部，双脚与肩同宽或略宽，脚尖微向外展。',
    analysisEn: 'The squat is the foundation of strength training, primarily targeting the quadriceps, glutes, hamstrings, and core. A proper squat effectively builds lower body strength, power, and overall athletic performance. The barbell rests on the upper trapezius, feet shoulder-width or slightly wider, toes slightly turned out.',
    targetMuscles: ['股四头肌', '臀大肌', '腘绳肌', '核心肌群', '竖脊肌'],
    targetMusclesEn: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core', 'Erector Spinae'],
    steps: [
      '站姿：双脚与肩同宽，杠铃置于斜方肌上部，双手握杠略宽于肩',
      '收紧核心，挺胸沉肩，保持脊柱中立位',
      '吸气后屏气（瓦式呼吸），臀部向后下方坐，就像坐椅子',
      '下蹲至大腿与地面平行或略低，膝盖方向与脚尖一致',
      '脚后跟发力蹬地，臀部和肩膀同步上升回到起始位置',
      '全程保持杠铃轨迹在脚中心正上方，重心均匀分布全脚掌'
    ],
    stepsEn: [
      'Setup: Feet shoulder-width apart, barbell on upper traps, hands slightly wider than shoulders',
      'Brace your core, chest up, shoulders back, maintain neutral spine',
      'Inhale and hold (Valsalva), sit hips back and down like sitting in a chair',
      'Descend until thighs are parallel or slightly below, knees track over toes',
      'Drive through heels, hips and shoulders rise together back to start',
      'Keep barbell path over mid-foot throughout, weight evenly distributed'
    ],
    mistakes: [
      '膝盖内扣 - 有意识地外展膝盖，与脚尖方向一致',
      '脚跟离地 - 改善踝关节灵活性，重心保持在脚掌中部',
      '躯干过度前倾 - 加强核心和上背部力量，挺胸抬头',
      '下蹲深度不足 - 逐步增加深度，可做箱式深蹲辅助'
    ],
    mistakesEn: [
      'Knee valgus - Actively push knees out, track over toes',
      'Heels lifting - Improve ankle mobility, keep weight centered on mid-foot',
      'Excessive forward lean - Strengthen core and upper back, keep chest up',
      'Insufficient depth - Gradually increase depth, use box squats as accessory'
    ]
  },
  bench: {
    name: '卧推',
    nameEn: 'Bench Press',
    gif: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
    analysis: '卧推是发展上肢推力的核心动作，主要锻炼胸大肌、三角肌前束和肱三头肌。正确的卧推技术需要稳定的肩胛骨位置和合理的杠铃轨迹。躺下时眼睛在杠铃正下方，双脚踩实地面，肩胛骨收紧下沉，保持自然的腰椎曲度。',
    analysisEn: 'The bench press is the primary upper body pressing exercise, targeting the pectoralis major, anterior deltoids, and triceps. Proper technique requires stable scapular positioning and an optimal bar path. Eyes under the bar, feet planted, scapulae retracted and depressed, maintain natural lumbar arch.',
    targetMuscles: ['胸大肌', '三角肌前束', '肱三头肌', '前锯肌'],
    targetMusclesEn: ['Pectoralis Major', 'Anterior Deltoids', 'Triceps', 'Serratus Anterior'],
    steps: [
      '仰卧在平板凳上，眼睛位于杠铃正下方',
      '双脚踩实地面，收紧臀部，肩胛骨向后向下收紧',
      '双手握杠略宽于肩，手腕保持中立位',
      '出杠后杠铃位于肩关节正上方，锁定肘关节',
      '吸气后控制下降，杠铃轻触下胸部（乳头线附近）',
      '发力推起，杠铃轨迹呈微弧线，回到起始位置锁定'
    ],
    stepsEn: [
      'Lie flat on bench, eyes directly under the barbell',
      'Plant feet firmly, squeeze glutes, retract and depress scapulae',
      'Grip slightly wider than shoulder-width, wrists neutral',
      'Unrack with bar over shoulder joints, lock elbows',
      'Inhale, lower bar with control to lower chest (nipple line)',
      'Press up in a slight arc path, return to lockout position'
    ],
    mistakes: [
      '肘部过度外展 - 保持肘部与躯干呈45-75°夹角',
      '肩胛骨不稳定 - 全程保持肩胛骨收紧下沉',
      '杠铃触胸位置过高 - 触胸点应在下胸部/乳头线附近',
      '臀部离开凳面 - 保持臀部始终接触凳面'
    ],
    mistakesEn: [
      'Elbow flare - Keep elbows at 45-75° angle to torso',
      'Unstable scapulae - Maintain retraction and depression throughout',
      'Bar touching too high on chest - Touch at lower chest/nipple line',
      'Hips lifting off bench - Keep glutes in contact with bench at all times'
    ]
  },
  deadlift: {
    name: '硬拉',
    nameEn: 'Deadlift',
    gif: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif',
    analysis: '硬拉是全身性的力量动作，主要锻炼腘绳肌、臀大肌、竖脊肌和斜方肌。它是最基础的功能性动作之一，模拟了从地面提起重物的自然模式。正确的硬拉强调髋铰链机制，保持脊柱中立，通过髋部和膝部的协同伸展完成拉起。',
    analysisEn: 'The deadlift is a full-body strength movement, primarily targeting the hamstrings, glutes, erector spinae, and trapezius. It is one of the most fundamental functional movements, simulating picking up objects from the ground. Proper form emphasizes the hip hinge, neutral spine, and coordinated hip and knee extension.',
    targetMuscles: ['腘绳肌', '臀大肌', '竖脊肌', '斜方肌', '前臂屈肌'],
    targetMusclesEn: ['Hamstrings', 'Glutes', 'Erector Spinae', 'Trapezius', 'Forearm Flexors'],
    steps: [
      '站姿：双脚与髋同宽，杠铃位于脚中心正上方，小腿贴近杠铃',
      '屈髋俯身，双手握杠（正握或正反握），手臂伸直',
      '臀部下沉至背部平坦，挺胸，肩胛骨位于杠铃正上方或略前',
      '收紧背阔肌（想象夹住腋下），建立全身张力',
      '脚后跟发力蹬地，杠铃沿小腿和大腿前侧竖直拉起',
      '锁定：臀部前推，膝盖伸直，肩膀后展，全程脊柱中立',
      '下放：先屈髋后屈膝，控制杠铃沿原路返回地面'
    ],
    stepsEn: [
      'Stance: Feet hip-width, bar over mid-foot, shins close to bar',
      'Hinge at hips, grip bar (double overhand or mixed), arms straight',
      'Lower hips until back is flat, chest up, scapulae over or slightly ahead of bar',
      'Engage lats (imagine squeezing armpits), build full-body tension',
      'Push through heels, drag bar up shins and thighs vertically',
      'Lockout: Hips forward, knees straight, shoulders back, neutral spine throughout',
      'Lower: Hinge hips then bend knees, control bar back along same path'
    ],
    mistakes: [
      '腰背弯曲 - 降低重量，收紧核心，保持脊柱中立位',
      '杠铃远离身体 - 杠铃始终贴近小腿和大腿前侧',
      '过早抬臀 - 保持肩部和髋部同步上升',
      '过度后仰锁定 - 锁定时只需站直，不要过度后仰'
    ],
    mistakesEn: [
      'Rounded back - Reduce weight, brace core, maintain neutral spine',
      'Bar drifting away - Keep bar in contact with shins and thighs throughout',
      'Hips rising too early - Keep shoulders and hips rising together',
      'Over-extending at lockout - Simply stand tall, do not lean back excessively'
    ]
  },
  ohp: {
    name: '肩推',
    nameEn: 'Overhead Press',
    gif: 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Dumbbell-Shoulder-Press.gif',
    analysis: '肩推（实力举）是发展肩部力量和上肢推力的经典动作，主要锻炼三角肌（尤其是前束和中束）、肱三头肌和上胸肌。站姿肩推还需强大的核心稳定性。动作过程中杠铃从锁骨高度起始，沿面部前方竖直推至头顶锁定，头部自然移动避让杠铃路径。',
    analysisEn: 'The overhead press (strict press) is the classic shoulder strength builder, primarily targeting the deltoids (especially anterior and medial heads), triceps, and upper chest. The standing version also demands significant core stability. The bar starts at clavicle height and is pressed vertically overhead, with the head naturally moving to clear the bar path.',
    targetMuscles: ['三角肌', '肱三头肌', '上胸肌', '核心肌群', '斜方肌'],
    targetMusclesEn: ['Deltoids', 'Triceps', 'Upper Chest', 'Core', 'Trapezius'],
    steps: [
      '站姿：双脚与肩同宽，杠铃置于锁骨前方，握距略宽于肩',
      '收紧核心和臀部，手腕中立，前臂垂直于地面',
      '头部微后仰，杠铃沿面部前方竖直推起',
      '杠铃经过面部时，头部前移至杠铃下方',
      '锁定：手臂完全伸直，杠铃位于头顶正上方',
      '控制下放：杠铃沿原路径回到锁骨前方位置',
      '全程保持核心收紧，避免腰椎过伸'
    ],
    stepsEn: [
      'Stance: Feet shoulder-width, bar on front delts/clavicles, grip slightly wider than shoulders',
      'Brace core and glutes, wrists neutral, forearms vertical',
      'Tilt head slightly back, press bar vertically in front of face',
      'As bar passes face, move head forward under the bar',
      'Lockout: Arms fully extended, bar directly overhead',
      'Controlled descent: Return bar along same path to front rack position',
      'Maintain core brace throughout, avoid excessive lumbar extension'
    ],
    mistakes: [
      '过度弓腰 - 收紧核心和臀部，避免腰椎过伸',
      '杠铃轨迹前移 - 杠铃应沿直线竖直推起',
      '头部固定不动 - 杠铃经过时自然收下巴让出路径',
      '握距过宽 - 前臂应垂直于地面，握距适中'
    ],
    mistakesEn: [
      'Excessive back arch - Brace core and glutes, avoid lumbar hyperextension',
      'Bar path forward - Press bar in a straight vertical line',
      'Head staying fixed - Naturally tuck chin to clear bar path',
      'Grip too wide - Forearms should be vertical, use moderate grip width'
    ]
  }
};

// YOLO Pose Server 配置
const YOLO_CONFIG = {
  serverUrl: 'ws://localhost:8765/ws',
  autoConnect: false,
  reconnectDelay: 2000,
  maxReconnectAttempts: 5
};

// BLE 设备配置（可持久化到 localStorage）
const DEFAULT_BLE_CONFIG = {
  serviceUUID: '19b10000-e8f2-537e-4f6c-d104768a1214',
  hrCharUUID: '19b10001-e8f2-537e-4f6c-d104768a1214',
  accelCharUUID: '19b10002-e8f2-537e-4f6c-d104768a1214'
};
