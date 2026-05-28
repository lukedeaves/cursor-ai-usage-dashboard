import { state } from './state.js';
import { computeTotals } from './utils.js';
import { forecastEndOfMonth, detectAnomalies, modelEfficiency, userLeaderboard, groupSessions } from './analytics.js';
import { fmt$, fmtK } from './utils.js';

export function openPdfReport() {
  const { totalCost, totalRequests, totalTokens } = computeTotals(state.filteredData);
  const forecast = forecastEndOfMonth(state.rawData);
  const anomalies = detectAnomalies(state.filteredData, 'cost');
  const from = document.getElementById('f-date-from')?.value || '';
  const to = document.getElementById('f-date-to')?.value || '';

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups to print the report');
    return;
  }

  win.document.write(`<!DOCTYPE html><html><head><title>Cursor Usage Report</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  .meta { color: #666; font-size: 0.9rem; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
  .card label { font-size: 0.75rem; text-transform: uppercase; color: #888; }
  .card .val { font-size: 1.5rem; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 12px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f5f5f5; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <h1>Cursor AI Usage Report</h1>
  <p class="meta">Period: ${from || '—'} → ${to || '—'} · Generated ${new Date().toLocaleString()}</p>
  <div class="grid">
    <div class="card"><label>Total Cost</label><div class="val">${fmt$(totalCost)}</div></div>
    <div class="card"><label>Total Requests</label><div class="val">${totalRequests.toLocaleString()}</div></div>
    <div class="card"><label>Total Tokens</label><div class="val">${fmtK(totalTokens)}</div></div>
    ${forecast ? `<div class="card"><label>Projected ${forecast.monthLabel}</label><div class="val">${fmt$(forecast.projected)}</div></div>` : ''}
  </div>
  ${anomalies.length ? `<h2>Cost anomalies</h2><table><tr><th>Date</th><th>Cost</th></tr>${anomalies.map(a => `<tr><td>${a.date}</td><td>${a.fmt}</td></tr>`).join('')}</table>` : ''}
  <p style="margin-top:32px;color:#888;font-size:0.8rem">Private report — generated locally in your browser.</p>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export function renderInsightsPanel() {
  const el = document.getElementById('insights-content');
  if (!el || !state.filteredData.length) return;

  const forecast = forecastEndOfMonth(state.rawData);
  const anomalies = detectAnomalies(state.filteredData, 'cost');
  const tokenAnomalies = detectAnomalies(state.filteredData, 'tokens');

  let html = '<div class="insights-grid">';

  if (forecast) {
    html += `<div class="insight-card">
      <div class="insight-label">Projected spend · ${forecast.monthLabel}</div>
      <div class="insight-value">${fmt$(forecast.projected)}</div>
      <div class="insight-sub">${fmt$(forecast.spent)} spent · ${fmt$(forecast.dailyRate)}/day avg · ${forecast.daysRemaining} days left</div>
    </div>`;
  }

  html += `<div class="insight-card">
    <div class="insight-label">Cost anomalies</div>
    <div class="insight-value">${anomalies.length || 'None'}</div>
    <div class="insight-sub">${anomalies.length ? anomalies.map(a => `${a.date}: ${a.fmt}`).join(' · ') : 'No unusual cost spikes detected'}</div>
  </div>`;

  html += `<div class="insight-card">
    <div class="insight-label">Token anomalies</div>
    <div class="insight-value">${tokenAnomalies.length || 'None'}</div>
    <div class="insight-sub">${tokenAnomalies.length ? tokenAnomalies.slice(0, 3).map(a => `${a.date}: ${a.fmt}`).join(' · ') : 'No unusual token spikes'}</div>
  </div>`;

  html += '</div>';
  el.innerHTML = html;
}

export function renderModelEfficiencyTable() {
  const el = document.getElementById('efficiency-table');
  if (!el) return;
  const data = modelEfficiency(state.filteredData);
  if (!data.length) {
    el.innerHTML = '<p class="muted">No efficiency data for current filters.</p>';
    return;
  }
  el.innerHTML = `<table class="data-mini-table"><thead><tr>
    <th>Model</th><th>$/1K tokens</th><th>Total cost</th><th>Requests</th>
  </tr></thead><tbody>${data.slice(0, 12).map(r => `<tr>
    <td>${r.model}</td><td>${fmt$((r.costPer1k))}</td><td>${fmt$(r.totalCost)}</td><td>${r.requests}</td>
  </tr>`).join('')}</tbody></table>`;
}

export function renderLeaderboard() {
  const section = document.getElementById('leaderboard-section');
  const el = document.getElementById('leaderboard-table');
  if (!section || !el) return;

  section.style.display = state.hasUsers ? '' : 'none';
  if (!state.hasUsers) return;

  const data = userLeaderboard(state.filteredData);
  el.innerHTML = `<table class="data-mini-table"><thead><tr>
    <th>#</th><th>User</th><th>Cost</th><th>Requests</th><th>Tokens</th>
  </tr></thead><tbody>${data.map((r, i) => `<tr>
    <td>${i + 1}</td><td>${r.user}</td><td>${fmt$(r.cost)}</td><td>${r.requests}</td><td>${fmtK(r.tokens)}</td>
  </tr>`).join('')}</tbody></table>`;
}

export function renderSessionsList() {
  const el = document.getElementById('sessions-list');
  if (!el) return;
  const sessions = groupSessions(state.filteredData);
  if (!sessions.length) {
    el.innerHTML = '<p class="muted">No sessions in current filter.</p>';
    return;
  }
  el.innerHTML = sessions.map(s => `
    <div class="session-item">
      <div class="session-head"><strong>Session ${s.id}</strong> · ${s.requests} requests · ${fmt$(s.cost)}</div>
      <div class="session-sub">${s.start.slice(0, 16)} → ${s.end.slice(0, 16)} · ~${s.durationMin} min · ${s.models.slice(0, 3).join(', ')}</div>
    </div>`).join('');
}
