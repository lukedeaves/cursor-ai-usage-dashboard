/* Classic Web Worker — parses large CSV off the main thread */
importScripts('../../vendor/papaparse.min.js');

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
    date: normaliseDate(row['Date'] || row['date']),
    user: String(row['User'] || row['user'] || '').trim(),
    kind: String(row['Kind'] || row['kind'] || '').trim(),
    model: String(row['Model'] || row['model'] || '').trim(),
    maxMode: String(row['Max Mode'] || row['max_mode'] || '').trim(),
    inputCache: parseNum(row['Input (w/ Cache Write)']),
    inputNoCache: parseNum(row['Input (w/o Cache Write)']),
    cacheRead: parseNum(row['Cache Read']),
    output: parseNum(row['Output Tokens']),
    total: parseNum(row['Total Tokens']),
    cost: parseNum(row['Cost']),
  })).filter(r => r.date);
}

const REQUIRED = ['Date', 'Kind', 'Model', 'Max Mode', 'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read', 'Output Tokens', 'Total Tokens', 'Cost'];

function validateSchema(fields) {
  if (!fields?.length) return { valid: false, missing: REQUIRED, message: 'No header row' };
  const set = new Set(fields.map(f => f.trim()));
  const missing = REQUIRED.filter(c => !set.has(c));
  return { valid: missing.length === 0, missing, message: missing.length ? `Missing: ${missing.join(', ')}` : null };
}

self.onmessage = e => {
  try {
    const results = Papa.parse(e.data.text, { header: true, skipEmptyLines: true });
    const schema = validateSchema(results.meta?.fields || []);
    const rows = parseCsvRows(results.data);
    self.postMessage({ rows, schema, rowCount: results.data.length });
  } catch (err) {
    self.postMessage({ error: err.message || String(err) });
  }
};
