/* ============================================
   trajectory.js — 杠铃轨迹 Canvas 绘制
   ============================================ */

class TrajectoryView {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.padding = 50;

    this.currentRepPoints = [];    // 当前正在进行的 rep
    this.previousRepPoints = [];   // 已完成 rep 的轨迹（浅色）
    this.idealPath = [];
    this.postureScore = 0;

    // 配速线（轨迹拖尾）
    this.trailPoints = [];

    this.draw();
  }

  setIdealPath(points) {
    this.idealPath = points;
  }

  update(currentBarX, currentBarY, allTrajectories, currentRepTrajectory) {
    // 已完成的历史轨迹
    this.previousRepPoints = allTrajectories || [];
    // 当前 rep 的轨迹
    this.currentRepPoints = currentRepTrajectory || [];
    // 当前拖尾点
    this.trailPoints.push({ x: currentBarX, y: currentBarY, life: 1.0 });
    // 衰减旧拖尾
    for (const p of this.trailPoints) p.life -= 0.06;
    this.trailPoints = this.trailPoints.filter(p => p.life > 0);
    if (this.trailPoints.length > 30) this.trailPoints = this.trailPoints.slice(-30);

    this.draw(currentBarX, currentBarY);
  }

  draw(currentBarX, currentBarY) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const pad = this.padding;

    ctx.clearRect(0, 0, w, h);

    // 背景网格
    this.drawGrid(pad);

    // 已完成 rep 的轨迹（淡色）
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    for (const rep of this.previousRepPoints) {
      if (rep.length < 2) continue;
      ctx.beginPath();
      const p0 = this.worldToScreen(rep[0].x, rep[0].y, pad, w, h);
      ctx.moveTo(p0.sx, p0.sy);
      for (let i = 1; i < rep.length; i++) {
        const p = this.worldToScreen(rep[i].x, rep[i].y, pad, w, h);
        ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();
    }

    // 理想轨迹
    if (this.idealPath.length > 1) {
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      const ip0 = this.worldToScreen(this.idealPath[0].x, this.idealPath[0].y, pad, w, h);
      ctx.moveTo(ip0.sx, ip0.sy);
      for (let i = 1; i < this.idealPath.length; i++) {
        const ip = this.worldToScreen(this.idealPath[i].x, this.idealPath[i].y, pad, w, h);
        ctx.lineTo(ip.sx, ip.sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 当前 rep 轨迹
    if (this.currentRepPoints.length > 1) {
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(0, 255, 136, 0.4)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const cp0 = this.worldToScreen(this.currentRepPoints[0].x, this.currentRepPoints[0].y, pad, w, h);
      ctx.moveTo(cp0.sx, cp0.sy);
      for (let i = 1; i < this.currentRepPoints.length; i++) {
        const cp = this.worldToScreen(this.currentRepPoints[i].x, this.currentRepPoints[i].y, pad, w, h);
        ctx.lineTo(cp.sx, cp.sy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 拖尾效果
    for (const tp of this.trailPoints) {
      const tps = this.worldToScreen(tp.x, tp.y, pad, w, h);
      ctx.beginPath();
      ctx.arc(tps.sx, tps.sy, 4 * tp.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 136, ${0.3 * tp.life})`;
      ctx.fill();
    }

    // 当前杠铃位置
    if (currentBarX !== undefined && currentBarY !== undefined) {
      const bar = this.worldToScreen(currentBarX, currentBarY, pad, w, h);
      // 外发光
      ctx.beginPath();
      ctx.arc(bar.sx, bar.sy, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
      ctx.fill();
      // 主体
      ctx.beginPath();
      ctx.arc(bar.sx, bar.sy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fill();
      ctx.strokeStyle = '#0a0e14';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 标签
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const topP = this.worldToScreen(0.5, 0.9, pad, w, h);
    ctx.fillText('顶部', topP.sx, topP.sy + 16);
    const botP = this.worldToScreen(0.5, 0.1, pad, w, h);
    ctx.fillText('底部', botP.sx, botP.sy - 10);
  }

  drawGrid(pad) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = pad + (w - 2 * pad) * i / 10;
      const y = pad + (h - 2 * pad) * i / 10;
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }

    // 轴线
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const midX = pad + (w - 2 * pad) / 2;
    ctx.beginPath(); ctx.moveTo(midX, pad); ctx.lineTo(midX, h - pad); ctx.stroke();
  }

  worldToScreen(wx, wy, pad, w, h) {
    // 世界坐标 (0-1) -> 屏幕坐标，y 翻转
    const sx = pad + (w - 2 * pad) * wx;
    const sy = h - (pad + (h - 2 * pad) * wy);
    return { sx, sy };
  }
}
