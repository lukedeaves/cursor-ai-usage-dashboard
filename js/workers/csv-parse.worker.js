/* Classic Web Worker — parses large CSV off the main thread */
importScripts('../../vendor/papaparse.min.js');

function normalizeHeader(h) {
  return String(h ?? '').replace(/^\uFEFF/, '').trim();
}

function csvField(row, ...names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') return row[name];
  }
  const keys = Object.keys(row);
  for (const name of names) {
    const hit = keys.find(k => normalizeHeader(k) === name);
    if (hit && row[hit] !== undefined && row[hit] !== null && row[hit] !== '') return row[hit];
  }
  return undefined;
}

function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  return parseFloat(String(v).replace(/[$,]/g, '')) || 0;
}

function normaliseDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`;
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return s;
}

function parseCsvRows(data) {
  return data.map(row => ({
    date: normaliseDate(csvField(row, 'Date', 'date')),
    user: String(csvField(row, 'User', 'user') ?? '').trim(),
    cloudAgentId: String(csvField(row, 'Cloud Agent ID') ?? '').trim(),
    automationId: String(csvField(row, 'Automation ID') ?? '').trim(),
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

const REQUIRED = ['Date', 'Kind', 'Model', 'Max Mode', 'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read', 'Output Tokens', 'Total Tokens', 'Cost'];
const OPTIONAL = ['User', 'Cloud Agent ID', 'Automation ID'];

function validateSchema(fields) {
  const normalized = (fields || []).map(normalizeHeader).filter(Boolean);
  if (!normalized.length) return { valid: false, missing: REQUIRED, message: 'No header row' };
  const set = new Set(normalized);
  const missing = REQUIRED.filter(c => !set.has(c));
  const known = new Set([...REQUIRED, ...OPTIONAL]);
  const unknown = normalized.filter(f => !known.has(f));
  return {
    valid: missing.length === 0,
    missing,
    message: missing.length ? `Missing: ${missing.join(', ')}` : (unknown.length ? `New columns: ${unknown.join(', ')}` : null),
  };
}

self.onmessage = e => {
  try {
    let text = e.data.text;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
    });
    const schema = validateSchema(results.meta?.fields || []);
    const rows = parseCsvRows(results.data);
    self.postMessage({ rows, schema, rowCount: results.data?.length || 0 });
  } catch (err) {
    self.postMessage({ error: err.message || String(err) });
  }
};
