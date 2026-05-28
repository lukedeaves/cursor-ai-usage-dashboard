import { state } from './state.js';
import { METRIC_CONFIG, fmt$, fmtK, buildMetricByBucket } from './utils.js';
import { getPreviousPeriodRows, computeTotals, pctChange, buildTokenComponentsByBucket } from './filters.js';
import { animateValue, renderSparkline, staggerDashboard } from './ui.js';
import { renderCostChart, renderModelChart } from './charts.js';
import { renderTable } from './table.js';

export function renderAll() {
  if (!state.filteredData.length && !state.rawData.length) return;

  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  staggerDashboard(true);

  const dates = state.filteredData.map(r => r.date).filter(Boolean).sort();
  const badge = document.getElementById('date-range-badge');
  if (dates.length) {
    badge.textContent = dates[0] + ' → ' + dates[dates.length - 1];
    badge.style.display = 'inline-block';
  }

  renderKPIs();
  renderCostChart();
  renderModelChart();
  renderTable();
}

export function renderKPIs() {
  const { totalCost, totalRequests, totalTokens, totalOutput } = computeTotals(state.filteredData);
  const avgCostPerReq = totalRequests ? totalCost / totalRequests : 0;
  const avgTokensPerReq = totalRequests ? totalTokens / totalRequests : 0;
  const outputPct = totalTokens ? ((totalOutput / totalTokens) * 100).toFixed(1) : '0';

  let usersLabel = '';
  if (state.hasUsers) {
    const users = new Set(state.filteredData.map(r => r.user).filter(Boolean));
    usersLabel = users.size > 1 ? ` · across ${users.size} users` : (users.size === 1 ? ` · ${[...users][0]}` : '');
  }

  const from = document.getElementById('f-date-from').value;
  const to = document.getElementById('f-date-to').value;
  const prevRows = getPreviousPeriodRows(state.rawData, from, to);
  const prev = computeTotals(prevRows);

  animateValue(document.getElementById('kpi-cost'), totalCost, fmt$);
  document.getElementById('kpi-cost-sub').textContent = `avg ${fmt$(avgCostPerReq)} per request${usersLabel}`;
  setDelta('kpi-cost-delta', pctChange(totalCost, prev.totalCost));

  animateValue(document.getElementById('kpi-requests'), totalRequests, v => Math.round(v).toLocaleString());
  document.getElementById('kpi-requests-sub').textContent = `${fmtK(Math.round(avgTokensPerReq))} avg tokens/request`;
  setDelta('kpi-requests-delta', pctChange(totalRequests, prev.totalRequests));

  animateValue(document.getElementById('kpi-tokens'), totalTokens, fmtK);
  document.getElementById('kpi-tokens-sub').textContent = 'total across all requests';
  setDelta('kpi-tokens-delta', pctChange(totalTokens, prev.totalTokens));

  animateValue(document.getElementById('kpi-output'), totalOutput, fmtK);
  document.getElementById('kpi-output-sub').textContent = `${outputPct}% of total tokens`;
  setDelta('kpi-output-delta', pctChange(totalOutput, prev.totalOutput));

  renderKpiSparklines();
}

function setDelta(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!isFinite(pct) || pct === 0) {
    el.textContent = '';
    el.className = 'kpi-delta';
    return;
  }
  const sign = pct > 0 ? '+' : '';
  el.textContent = `${sign}${pct.toFixed(1)}% vs prev period`;
  el.className = `kpi-delta ${pct > 0 ? 'up' : 'down'}`;
}

function renderKpiSparklines() {
  const gran = 'day';
  const costPts = buildMetricByBucket(state.filteredData, gran, 'cost').map(p => p.y);
  const reqPts = buildMetricByBucket(state.filteredData, gran, 'requests').map(p => p.y);
  const tokPts = buildMetricByBucket(state.filteredData, gran, 'tokens').map(p => p.y);
  const outPts = state.filteredData.reduce((acc, r) => {
    const d = r.date.slice(0, 10);
    acc[d] = (acc[d] || 0) + r.output;
    return acc;
  }, {});
  const outVals = Object.keys(outPts).sort().map(k => outPts[k]);

  renderSparkline(document.getElementById('spark-cost'), costPts.slice(-14), '#7c6af7');
  renderSparkline(document.getElementById('spark-requests'), reqPts.slice(-14), '#56cfb2');
  renderSparkline(document.getElementById('spark-tokens'), tokPts.slice(-14), '#f7a76a');
  renderSparkline(document.getElementById('spark-output'), outVals.slice(-14), '#f76a8a');
}

export function setMetric(m) {
  state.metric = m;
  document.querySelectorAll('#metric-toggle button').forEach(b =>
    b.classList.toggle('active', b.dataset.metric === m));
  document.querySelectorAll('.kpi-card[data-metric]').forEach(c =>
    c.classList.toggle('kpi-active', c.dataset.metric === m));
  if (state.rawData.length) {
    renderCostChart();
    renderModelChart();
  }
}

export function setGranularity(g) {
  state.granularity = g;
  document.querySelectorAll('#granularity-toggle button').forEach(b =>
    b.classList.toggle('active', b.dataset.gran === g));
  if (state.rawData.length) renderCostChart();
}

export { METRIC_CONFIG };
