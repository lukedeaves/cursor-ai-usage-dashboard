/** Strip UTF-8 BOM and normalize raw CSV text before parsing. */
export function normalizeCsvText(text) {
  if (!text) return '';
  let s = text;
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  return s.replace(/^\uFEFF/, '');
}

/** Normalize a CSV header cell (BOM, whitespace). */
export function normalizeHeader(h) {
  return String(h ?? '').replace(/^\uFEFF/, '').trim();
}

/** Read a field from a parsed row using exact or normalized header names. */
export function csvField(row, ...names) {
  if (!row || typeof row !== 'object') return undefined;
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

export const PAPA_PARSE_OPTIONS = {
  header: true,
  skipEmptyLines: true,
  transformHeader: normalizeHeader,
};

export function normalizeHeaderList(fields) {
  return (fields || []).map(normalizeHeader).filter(Boolean);
}
