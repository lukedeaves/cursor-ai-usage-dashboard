import { state } from './state.js';
import { getComparePeriodRows, comparePeriodTotals } from './analytics.js';
import { buildMetricByBucket, fmt$ } from './utils.js';

export function renderCompareChart() {
  const wrap = document.getElementById('compare-chart-wrap');
  if (!wrap || !state.compareEnabled) return;

  const aFrom = document.getElementById('compare-a-from')?.value;
  const aTo = document.getElementById('compare-a-to')?.value;
  const bFrom = document.getElementById('compare-b-from')?.value;
  const bTo = document.getElementById('compare-b-to')?.value;

  const rowsA = getComparePeriodRows(state.rawData, aFrom, aTo);
  const rowsB = getComparePeriodRows(state.rawData, bFrom, bTo);
  const totals = comparePeriodTotals(rowsA, rowsB);

  document.getElementById('compare-summary').textContent =
    `A: ${fmt$(totals.a.totalCost)} / ${totals.a.totalRequests} req · B: ${fmt$(totals.b.totalCost)} / ${totals.b.totalRequests} req`;

  const ctx = document.getElementById('compare-chart')?.getContext('2d');
  if (!ctx) return;

  if (state.compareChart) state.compareChart.destroy();

  const metric = state.metric;
  const ptsA = buildMetricByBucket(rowsA, 'day', metric);
  const ptsB = buildMetricByBucket(rowsB, 'day', metric);
  const labels = [...new Set([...ptsA.map(p => p.x), ...ptsB.map(p => p.x)])].sort();

  state.compareChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `Period A (${aFrom} → ${aTo})`,
          data: labels.map(l => ptsA.find(p => p.x === l)?.y ?? null),
          borderColor: '#7c6af7',
          backgroundColor: 'rgba(124,106,247,0.12)',
          fill: true,
          tension: 0.35,
        },
        {
          label: `Period B (${bFrom} → ${bTo})`,
          data: labels.map(l => ptsB.find(p => p.x === l)?.y ?? null),
          borderColor: '#56cfb2',
          backgroundColor: 'rgba(86,207,178,0.12)',
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8890b0' } } },
      scales: {
        x: { ticks: { color: '#8890b0', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8890b0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
      },
    },
  });
}

export function initCompareDefaults() {
  const dates = state.rawData.map(r => r.date).filter(Boolean).sort();
  if (dates.length < 2) return;

  const mid = Math.floor(dates.length / 2);
  const aFrom = document.getElementById('compare-a-from');
  const aTo = document.getElementById('compare-a-to');
  const bFrom = document.getElementById('compare-b-from');
  const bTo = document.getElementById('compare-b-to');
  if (aFrom) aFrom.value = dates[0];
  if (aTo) aTo.value = dates[mid];
  if (bFrom) bFrom.value = dates[mid + 1] || dates[mid];
  if (bTo) bTo.value = dates[dates.length - 1];
}

export function setupCompareControls(onUpdate) {
  document.getElementById('compare-toggle')?.addEventListener('change', e => {
    state.compareEnabled = e.target.checked;
    const section = document.getElementById('compare-section');
    if (section) section.style.display = state.compareEnabled ? '' : 'none';
    if (state.compareEnabled) onUpdate();
  });

  ['compare-a-from', 'compare-a-to', 'compare-b-from', 'compare-b-to'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (state.compareEnabled) onUpdate();
    });
  });
}
