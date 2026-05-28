export const PALETTE = [
  '#7c6af7', '#56cfb2', '#f7a76a', '#f76a8a',
  '#6ab4f7', '#d4f76a', '#f76ad4', '#6af7c4',
  '#c46af7', '#f7c46a', '#6af7a7', '#f7836a',
];

export function colorFor(i) {
  return PALETTE[i % PALETTE.length];
}

export function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  return parseFloat(String(v).replace(/[$,]/g, '')) || 0;
}

export function fmt$(n) {
  if (n >= 1) return '$' + n.toFixed(2);
  return '$' + n.toFixed(4);
}

export function fmtK(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

export function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

export function isoMonth(dateStr) {
  return dateStr.slice(0, 7);
}

export function bucketKey(dateStr, gran) {
  if (gran === 'week') return isoWeek(dateStr);
  if (gran === 'month') return isoMonth(dateStr);
  return dateStr.slice(0, 10);
}

export function normaliseDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`;
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return s;
}

import { csvField } from './csv-fields.js';

export function makeRowKey(r) {
  return [r.date, r.user, r.cloudAgentId, r.automationId, r.kind, r.model, r.maxMode,
    r.inputCache, r.inputNoCache, r.cacheRead,
    r.output, r.total, r.cost.toFixed(6)].join('|');
}

export function parseCsvRows(data) {
  return data.map(row => ({
    date: normaliseDate(csvField(row, 'Date', 'date')),
    user: String(csvField(row, 'User', 'user') ?? '').trim(),
    cloudAgentId: String(csvField(row, 'Cloud Agent ID', 'Cloud Agent Id') ?? '').trim(),
    automationId: String(csvField(row, 'Automation ID', 'Automation Id') ?? '').trim(),
    kind: String(csvField(row, 'Kind', 'kind') ?? '').trim(),
    model: String(csvField(row, 'Model', 'model') ?? '').trim(),
    maxMode: String(csvField(row, 'Max Mode', 'max_mode') ?? '').trim(),
    inputCache: parseNum(csvField(row, 'Input (w/ Cache Write)')),
    inputNoCache: parseNum(csvField(row, 'Input (w/o Cache Write)')),
    cacheRead: parseNum(csvField(row, 'Cache Read')),
    output: parseNum(csvField(row, 'Output Tokens')),
    total: parseNum(csvField(row, 'Total Tokens')),
    cost: parseNum(csvField(row, 'Cost')),
  })).filter(r => r.date);
}

export function applyRowFilters(rows, { from, to, users, kinds, models }) {
  return rows.filter(r => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (users.length && !users.includes(r.user)) return false;
    if (kinds.length && !kinds.includes(r.kind)) return false;
    if (models.length && !models.includes(r.model)) return false;
    return true;
  });
}

export function buildMetricByBucket(rows, gran, m) {
  const map = {};
  rows.forEach(r => {
    const key = bucketKey(r.date, gran);
    if (!map[key]) map[key] = 0;
    if (m === 'cost') map[key] += r.cost;
    if (m === 'requests') map[key] += 1;
    if (m === 'tokens') map[key] += r.total;
  });
  return Object.keys(map).sort().map(k => ({ x: k, y: map[k] }));
}

export function getDateRange(rows) {
  const dates = rows.map(r => r.date).filter(Boolean).sort();
  if (!dates.length) return { from: '', to: '' };
  return { from: dates[0], to: dates[dates.length - 1] };
}

export function getPeriodPresetRange(preset, rows) {
  const { from: dataFrom, to: dataTo } = getDateRange(rows);
  if (!dataFrom || !dataTo) return { from: '', to: '' };
  const end = new Date(dataTo + 'T12:00:00');
  const start = new Date(dataFrom + 'T12:00:00');

  if (preset === 'all') return { from: dataFrom, to: dataTo };

  if (preset === 'thisMonth') {
    const y = end.getFullYear();
    const m = end.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return {
      from: first.toISOString().slice(0, 10),
      to: last.toISOString().slice(0, 10),
    };
  }

  const days = preset === 'last7' ? 7 : 30;
  const fromDate = new Date(end);
  fromDate.setDate(fromDate.getDate() - (days - 1));
  const fromStr = fromDate.toISOString().slice(0, 10);
  return {
    from: fromStr < dataFrom ? dataFrom : fromStr,
    to: dataTo,
  };
}

export function computeTotals(rows) {
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalRequests = rows.length;
  const totalTokens = rows.reduce((s, r) => s + r.total, 0);
  const totalOutput = rows.reduce((s, r) => s + r.output, 0);
  return { totalCost, totalRequests, totalTokens, totalOutput };
}

export function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function getPreviousPeriodRows(rows, from, to) {
  if (!from || !to) return [];
  const start = new Date(from + 'T12:00:00');
  const end = new Date(to + 'T12:00:00');
  const spanMs = end - start + 86400000;
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - spanMs + 86400000);
  const pf = prevStart.toISOString().slice(0, 10);
  const pt = prevEnd.toISOString().slice(0, 10);
  return rows.filter(r => r.date >= pf && r.date <= pt);
}

export const METRIC_CONFIG = {
  cost: { label: 'Cost Over Time', color: '#7c6af7', bg: 'rgba(124,106,247,0.18)', fmt: v => fmt$(v), kpi: 'cost' },
  requests: { label: 'Requests Over Time', color: '#56cfb2', bg: 'rgba(86,207,178,0.18)', fmt: v => Math.round(v).toLocaleString(), kpi: 'requests' },
  tokens: { label: 'Tokens Over Time', color: '#f7a76a', bg: 'rgba(247,167,106,0.18)', fmt: v => fmtK(v), kpi: 'tokens' },
};
