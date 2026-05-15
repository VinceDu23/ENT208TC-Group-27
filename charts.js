/* ============================================
   charts.js — Chart.js 图表初始化与更新
   ============================================ */

class ChartsManager {
  constructor() {
    this.postureChart = null;
    this.volumeChart = null;
    this.compareChart = null;
    this.hrChart = null;
    this.hrChartData = [];  // 存储心率数据点
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initPostureChart();
    this.initVolumeChart();
    this.initCompareChart();
    this.initHRChart();
    this.initialized = true;
  }

  /** Update all chart data from current TREND_DATA/VOLUME_DATA/COMPARE_DATA globals */
  refreshAll() {
    if (this.postureChart) {
      this.postureChart.data.labels = TREND_DATA.labels;
      this.postureChart.data.datasets[0].data = TREND_DATA.overall;
      this.postureChart.update();
    }
    if (this.volumeChart) {
      this.volumeChart.data.labels = VOLUME_DATA.map(d => d.exercise);
      this.volumeChart.data.datasets[0].data = VOLUME_DATA.map(d => d.volume);
      this.volumeChart.update();
    }
    if (this.compareChart) {
      this.compareChart.data.labels = COMPARE_DATA.labels;
      this.compareChart.data.datasets[0].data = COMPARE_DATA.current;
      this.compareChart.data.datasets[1].data = COMPARE_DATA.previous;
      this.compareChart.update();
    }
  }

  initPostureChart() {
    const ctx = document.getElementById('chartPostureScore');
    if (!ctx) return;

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');

    this.postureChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: TREND_DATA.labels,
        datasets: [
          {
            label: '综合评分',
            data: TREND_DATA.overall,
            borderColor: '#00ff88',
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#00ff88',
            pointBorderColor: '#0a0e14',
            pointBorderWidth: 2,
            pointHoverRadius: 8
          }
        ]
      },
      options: this.getLineOptions()
    });
  }

  initVolumeChart() {
    const ctx = document.getElementById('chartVolume');
    if (!ctx) return;

    this.volumeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: VOLUME_DATA.map(d => d.exercise),
        datasets: [{
          label: '训练量 (kg)',
          data: VOLUME_DATA.map(d => d.volume),
          backgroundColor: [
            'rgba(0, 255, 136, 0.6)',
            'rgba(68, 170, 255, 0.5)',
            'rgba(255, 107, 53, 0.5)',
            'rgba(255, 204, 0, 0.5)'
          ],
          borderColor: [
            '#00ff88',
            '#44aaff',
            '#ff6b35',
            '#ffcc00'
          ],
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: this.getBarOptions()
    });
  }

  initCompareChart() {
    const ctx = document.getElementById('chartExerciseCompare');
    if (!ctx) return;

    this.compareChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: COMPARE_DATA.labels,
        datasets: [
          {
            label: '当前',
            data: COMPARE_DATA.current,
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#00ff88',
            pointRadius: 4
          },
          {
            label: '上次',
            data: COMPARE_DATA.previous,
            borderColor: 'rgba(255,255,255,0.3)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointBackgroundColor: 'rgba(255,255,255,0.4)',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 60,
            max: 100,
            ticks: {
              display: false,
              stepSize: 10
            },
            pointLabels: {
              color: '#8899aa',
              font: { size: 12 }
            },
            grid: {
              color: 'rgba(255,255,255,0.06)'
            },
            angleLines: {
              color: 'rgba(255,255,255,0.08)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#8899aa',
              usePointStyle: true,
              padding: 20,
              font: { size: 11 }
            }
          }
        }
      }
    });
  }

  initHRChart() {
    const ctx = document.getElementById('chartHeartRate');
    if (!ctx) return;

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(255, 68, 68, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 68, 68, 0)');

    this.hrChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: '心率',
          data: [],
          borderColor: '#ff4444',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#ff4444'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        scales: {
          x: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#5a6a7a', font: { size: 10 }, maxTicksLimit: 8 }
          },
          y: {
            min: 60,
            max: 170,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#5a6a7a', font: { size: 10 }, stepSize: 20 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  updateHRChart(hrHistory) {
    if (!this.hrChart) return;
    const labels = hrHistory.map(p => {
      const m = Math.floor(p.time / 60);
      const s = Math.floor(p.time % 60);
      return `${m}:${String(s).padStart(2,'0')}`;
    });
    const data = hrHistory.map(p => p.hr);

    this.hrChart.data.labels = labels;
    this.hrChart.data.datasets[0].data = data;
    this.hrChart.update('none');
  }

  getLineOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#5a6a7a', font: { size: 10 } }
        },
        y: {
          min: 60,
          max: 100,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#5a6a7a', font: { size: 10 }, stepSize: 10 }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#161c26',
          titleColor: '#e2e8f0',
          bodyColor: '#00ff88',
          borderColor: '#1e2a3a',
          borderWidth: 1,
          padding: 10
        }
      }
    };
  }

  getBarOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#8899aa', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#5a6a7a', font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    };
  }
}
