import { state } from './state.js';
import { METRIC_CONFIG, fmtK, colorFor } from './utils.js';
import { buildMetricByBucket, buildTokenComponentsByBucket } from './filters.js';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function chartAnimation() {
  return reducedMotion() ? false : { duration: 800, easing: 'easeOutQuart' };
}

function glassTooltipOptions(fmtFn) {
  return {
    enabled: true,
    backgroundColor: 'rgba(26, 29, 39, 0.92)',
    titleColor: '#e8eaf0',
    bodyColor: '#c8cce0',
    borderColor: 'rgba(124, 106, 247, 0.45)',
    borderWidth: 1,
    cornerRadius: 10,
    padding: 12,
    displayColors: true,
    callbacks: {
      label: ctx => {
        const label = ctx.dataset.label || '';
        const value = ctx.parsed.y;
        if (label) return `${label}: ${fmtFn(value)}`;
        return ' ' + fmtFn(value);
      },
    },
  };
}

function createGradient(ctx, color, height) {
  const g = ctx.createLinearGradient(0, 0, 0, height || 280);
  g.addColorStop(0, color.replace('0.18', '0.45').replace('rgba', 'rgba'));
  if (color.startsWith('#')) {
    g.addColorStop(0, color + '66');
    g.addColorStop(1, color + '00');
  } else {
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
  }
  return g;
}

export function renderCostChart() {
  const cfg = METRIC_CONFIG[state.metric];
  const canvas = document.getElementById('cost-chart');
  const ctx = canvas.getContext('2d');
  document.getElementById('time-chart-title').textContent = cfg.label;

  if (state.costChart) state.costChart.destroy();

  let chartData, chartOptions;

  if (state.metric === 'tokens') {
    const datasets = buildTokenComponentsByBucket(state.granularity);
    chartData = { datasets };
    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: chartAnimation(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          onClick: (e, legendItem, legend) => {
            const index = legendItem.datasetIndex;
            const meta = legend.chart.getDatasetMeta(index);
            meta.hidden = !meta.hidden;
            legend.chart.update();
            const label = datasets[index].label;
            if (meta.hidden) state.hiddenTokenComponents.add(label);
            else state.hiddenTokenComponents.delete(label);
          },
          labels: { color: '#8890b0', font: { size: 11 }, usePointStyle: true, padding: 12 },
        },
        tooltip: glassTooltipOptions(fmtK),
      },
      scales: baseScales(fmtK, true),
    };
  } else {
    const points = buildMetricByBucket(state.filteredData, state.granularity, state.metric);
    const grad = createGradient(ctx, cfg.color, 280);
    chartData = {
      datasets: [{
        label: cfg.label,
        data: points,
        borderColor: cfg.color,
        backgroundColor: grad,
        borderWidth: 2,
        pointBackgroundColor: cfg.color,
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.4,
      }],
    };
    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: chartAnimation(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: glassTooltipOptions(cfg.fmt),
        ...(state.metric === 'cost' && state.budgetMonthly ? { budgetLine: true } : {}),
      },
      scales: baseScales(cfg.fmt, false),
    };
  }

  state.costChart = new Chart(ctx, { type: 'line', data: chartData, options: chartOptions, plugins: state.metric === 'cost' && state.budgetMonthly ? [budgetLinePlugin()] : [] });

  if (state.metric === 'tokens' && state.hiddenTokenComponents.size > 0) {
    state.costChart.data.datasets.forEach((dataset, index) => {
      if (state.hiddenTokenComponents.has(dataset.label)) {
        state.costChart.getDatasetMeta(index).hidden = true;
      }
    });
    state.costChart.update();
  }
}

function baseScales(fmtFn, stacked) {
  const yScale = {
    stacked,
    ticks: { color: '#8890b0', font: { size: 11 }, callback: v => fmtFn(v) },
    grid: { color: 'rgba(255,255,255,0.06)' },
  };
  return {
    x: {
      type: 'category',
      ticks: { color: '#8890b0', maxTicksLimit: 12, font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
    y: yScale,
  };
}

function budgetLinePlugin() {
  return {
    id: 'budgetLine',
    afterDraw(chart) {
      const budget = parseFloat(state.budgetMonthly);
      if (!budget || state.metric !== 'cost') return;
      const yScale = chart.scales.y;
      if (!yScale) return;
      const y = yScale.getPixelForValue(budget);
      const { left, right } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#f76a8a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillStyle = '#f76a8a';
      ctx.font = '11px DM Sans, sans-serif';
      ctx.fillText(`Budget $${budget}`, right - 72, y - 6);
      ctx.restore();
    },
  };
}

export function renderModelChart() {
  const cfg = METRIC_CONFIG[state.metric];
  const TOP_N = 14;
  const map = {};
  state.filteredData.forEach(r => {
    const m = r.model || 'Unknown';
    const val = state.metric === 'cost' ? r.cost : state.metric === 'requests' ? 1 : r.total;
    map[m] = (map[m] || 0) + val;
  });

  const allSorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const top = allSorted.slice(0, TOP_N);
  const rest = allSorted.slice(TOP_N);
  const otherTotal = rest.reduce((sum, [, v]) => sum + v, 0);
  const sorted = otherTotal > 0 ? [...top, ['Other', otherTotal]] : top;
  const labels = sorted.map(([k]) => k);
  const values = sorted.map(([, v]) => v);

  const titleMap = { cost: 'Cost by Model', requests: 'Requests by Model', tokens: 'Tokens by Model' };
  document.getElementById('model-chart-title').textContent = titleMap[state.metric];

  state.modelColorMap = {};
  labels.forEach((label, i) => {
    state.modelColorMap[label] = label === 'Other' ? '#55607a' : colorFor(i);
  });

  const ctx = document.getElementById('model-chart').getContext('2d');
  if (state.modelChart) state.modelChart.destroy();

  state.modelChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: cfg.label.replace(' Over Time', ''),
        data: values,
        backgroundColor: labels.map(l => state.modelColorMap[l]),
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: chartAnimation(),
      plugins: {
        legend: { display: false },
        tooltip: glassTooltipOptions(cfg.fmt),
      },
      scales: {
        x: {
          ticks: { color: '#e8eaf0', font: { size: 11 }, maxRotation: 35, minRotation: 20 },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: { color: '#8890b0', font: { size: 11 }, callback: v => cfg.fmt(v) },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  });
}
