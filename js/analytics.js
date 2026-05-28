import { buildMetricByBucket, computeTotals, fmt$, fmtK } from './utils.js';

/** Project end-of-month cost from current daily run rate. */
export function forecastEndOfMonth(rows, referenceDate = new Date()) {
  if (!rows.length) return null;

  const now = new Date(referenceDate);
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const monthEnd = new Date(y, m + 1, 0);
  const monthEndStr = monthEnd.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const monthRows = rows.filter(r => r.date >= monthStart && r.date <= monthEndStr);
  const spent = monthRows.reduce((s, r) => s + r.cost, 0);
  const daysElapsed = Math.max(1, Math.ceil((new Date(todayStr) - new Date(monthStart)) / 86400000) + 1);
  const daysInMonth = monthEnd.getDate();
  const dailyRate = spent / daysElapsed;
  const projected = dailyRate * daysInMonth;

  return {
    spent,
    projected,
    dailyRate,
    daysElapsed,
    daysInMonth,
    daysRemaining: Math.max(0, daysInMonth - daysElapsed),
    monthLabel: monthEnd.toLocaleString('default', { month: 'long', year: 'numeric' }),
  };
}

/** Flag days with cost or token spikes (> mean + 2σ). */
export function detectAnomalies(rows, metric = 'cost') {
  const daily = buildMetricByBucket(rows, 'day', metric);
  if (daily.length < 3) return [];

  const values = daily.map(d => d.y);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance) || 1;
  const threshold = mean + 2 * std;

  return daily
    .filter(d => d.y > threshold && d.y > mean * 1.5)
    .map(d => ({
      date: d.x,
      value: d.y,
      mean,
      fmt: metric === 'cost' ? fmt$(d.y) : fmtK(d.y),
      metric,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

/** Cost per 1K tokens by model (lower = more efficient). */
export function modelEfficiency(rows) {
  const map = {};
  rows.forEach(r => {
    const m = r.model || 'Unknown';
    if (!map[m]) map[m] = { cost: 0, tokens: 0, requests: 0 };
    map[m].cost += r.cost;
    map[m].tokens += r.total;
    map[m].requests += 1;
  });

  return Object.entries(map)
    .filter(([, v]) => v.tokens > 0 && v.cost > 0)
    .map(([model, v]) => ({
      model,
      costPer1k: (v.cost / v.tokens) * 1000,
      totalCost: v.cost,
      totalTokens: v.tokens,
      requests: v.requests,
    }))
    .sort((a, b) => a.costPer1k - b.costPer1k);
}

/** Rank users by spend when User column present. */
export function userLeaderboard(rows) {
  const map = {};
  rows.forEach(r => {
    const u = r.user || '(unknown)';
    if (!map[u]) map[u] = { cost: 0, requests: 0, tokens: 0 };
    map[u].cost += r.cost;
    map[u].requests += 1;
    map[u].tokens += r.total;
  });

  return Object.entries(map)
    .map(([user, v]) => ({ user, ...v }))
    .sort((a, b) => b.cost - a.cost);
}

/** Cluster requests into work sessions by time gap (minutes). */
export function groupSessions(rows, gapMinutes = 30) {
  if (!rows.length) return [];

  const sorted = [...rows].sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    return ta - tb;
  });

  const gapMs = gapMinutes * 60 * 1000;
  const sessions = [];
  let current = null;

  sorted.forEach(r => {
    const t = new Date(r.date).getTime();
    if (!current || t - current.endTime > gapMs) {
      current = {
        start: r.date,
        end: r.date,
        startTime: t,
        endTime: t,
        requests: 0,
        cost: 0,
        tokens: 0,
        models: new Set(),
      };
      sessions.push(current);
    }
    current.end = r.date;
    current.endTime = t;
    current.requests += 1;
    current.cost += r.cost;
    current.tokens += r.total;
    if (r.model) current.models.add(r.model);
  });

  return sessions.map((s, i) => ({
    id: i + 1,
    start: s.start,
    end: s.end,
    requests: s.requests,
    cost: s.cost,
    tokens: s.tokens,
    models: [...s.models],
    durationMin: Math.max(1, Math.round((s.endTime - s.startTime) / 60000)),
  })).reverse().slice(0, 20);
}

export function getComparePeriodRows(allRows, from, to) {
  return allRows.filter(r => (!from || r.date >= from) && (!to || r.date <= to));
}

export function comparePeriodTotals(rowsA, rowsB) {
  const a = computeTotals(rowsA);
  const b = computeTotals(rowsB);
  return {
    a, b,
    costDelta: b.totalCost - a.totalCost,
    requestDelta: b.totalRequests - a.totalRequests,
    tokenDelta: b.totalTokens - a.totalTokens,
  };
}
