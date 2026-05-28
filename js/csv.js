import { parseCsvRows, makeRowKey } from './utils.js';
import { mergeRowsIntoDB, loadAllFromDB } from './db.js';
import { state } from './state.js';
import { saveLastImport } from './settings.js';
import { showToast } from './ui.js';
import { validateCsvSchema } from './schema.js';
import { shouldUseWorker, parseCsvInWorker } from './csv-worker.js';
import { normalizeCsvText, PAPA_PARSE_OPTIONS } from './csv-fields.js';

let onImportComplete = null;
export function setImportCallback(fn) { onImportComplete = fn; }

async function ingestParsedRows(parsed, schema, sourceLabel, rawRowCount = 0) {
  if (!parsed.length) {
    const hint = rawRowCount > 0
      ? `${rawRowCount} row(s) found but none had a valid Date. Check the CSV format.`
      : 'No data rows found in file.';
    throw new Error(hint);
  }

  if (schema?.message) {
    showToast(schema.message, schema.valid ? 'info' : 'error', 8000);
  }

  let added = parsed.length;
  let skipped = 0;
  try {
    const result = await mergeRowsIntoDB(parsed);
    added = result.added;
    skipped = result.skipped;
    state.rawData = await loadAllFromDB();
  } catch (err) {
    console.warn('IndexedDB unavailable, using in-memory data:', err);
    state.rawData = [...state.rawData, ...parsed];
    const seen = new Set();
    state.rawData = state.rawData.filter(r => {
      const k = makeRowKey(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  state.hasUsers = state.rawData.some(r => r.user !== '');
  state.hasTeamFields = state.rawData.some(r => r.cloudAgentId || r.automationId);
  saveLastImport();
  showToast(
    `Imported ${sourceLabel}: +${added.toLocaleString()} new · ${skipped.toLocaleString()} duplicates skipped · ${state.rawData.length.toLocaleString()} total`,
    'success'
  );
  if (onImportComplete) onImportComplete(sourceLabel, added, skipped);
  return { added, skipped, total: state.rawData.length };
}

export async function importCsvText(text, sourceLabel = 'CSV') {
  const label = document.getElementById('file-label');
  if (label) label.textContent = `Parsing ${sourceLabel}…`;

  const normalized = normalizeCsvText(text);

  if (shouldUseWorker(normalized)) {
    const { rows, schema, rowCount } = await parseCsvInWorker(normalized);
    return ingestParsedRows(rows, schema, sourceLabel, rowCount);
  }

  return new Promise((resolve, reject) => {
    Papa.parse(normalized, {
      ...PAPA_PARSE_OPTIONS,
      async complete(results) {
        try {
          const schema = validateCsvSchema(results.meta?.fields || []);
          const parsed = parseCsvRows(results.data);
          const result = await ingestParsedRows(parsed, schema, sourceLabel, results.data?.length || 0);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      },
      error(err) {
        reject(new Error(err.message));
      },
    });
  });
}

export async function importCsvFile(file) {
  const text = await file.text();
  return importCsvText(text, file.name || 'upload');
}

export async function importMultipleFiles(fileList) {
  const files = [...fileList].filter(isCsvLikeFile);
  if (!files.length) throw new Error('No CSV files selected');

  let totalAdded = 0;
  let totalSkipped = 0;
  for (const file of files) {
    const r = await importCsvFile(file);
    totalAdded += r.added;
    totalSkipped += r.skipped;
  }
  showToast(`Merged ${files.length} files: +${totalAdded} new rows total`, 'success');
  return { files: files.length, added: totalAdded, skipped: totalSkipped };
}

export function isCsvLikeFile(file) {
  if (!file?.name) return true;
  const n = file.name.toLowerCase();
  if (n.endsWith('.csv') || n.endsWith('.txt') || n.endsWith('.tsv')) return true;
  if (!n.includes('.')) return true;
  const mime = file.type || '';
  return mime.includes('csv') || mime.includes('text') || mime === 'application/vnd.ms-excel';
}

export async function importFromClipboard() {
  const text = await navigator.clipboard.readText();
  if (!text.trim()) throw new Error('Clipboard is empty');
  return importCsvText(text, 'clipboard');
}

export async function loadSampleData() {
  const label = document.getElementById('file-label');
  if (label) label.textContent = 'Loading sample data…';
  const res = await fetch('examples/sample_data.csv');
  if (!res.ok) throw new Error('Could not load sample data');
  return importCsvText(await res.text(), 'sample data');
}

export async function loadTeamSampleData() {
  const label = document.getElementById('file-label');
  if (label) label.textContent = 'Loading team sample…';
  const res = await fetch('examples/sample_team_data.csv');
  if (!res.ok) throw new Error('Could not load team sample data');
  return importCsvText(await res.text(), 'team sample');
}

export function exportFilteredCsv() {
  if (!state.filteredData.length) return;

  const headers = ['Date'];
  if (state.hasUsers) headers.push('User');
  if (state.hasTeamFields) {
    headers.push('Cloud Agent ID', 'Automation ID');
  }
  headers.push('Kind', 'Model', 'Max Mode', 'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read', 'Output Tokens', 'Total Tokens', 'Cost');

  const rows = state.filteredData.map(r => {
    const base = [r.date];
    if (state.hasUsers) base.push(r.user);
    if (state.hasTeamFields) base.push(r.cloudAgentId, r.automationId);
    base.push(r.kind, r.model, r.maxMode, r.inputCache, r.inputNoCache, r.cacheRead, r.output, r.total, r.cost.toFixed(6));
    return base;
  });

  const csv = Papa.unparse({ fields: headers, data: rows });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const dates = state.filteredData.map(r => r.date).filter(Boolean).sort();
  link.download = `cursor-usage${dates.length ? `_${dates[0]}_to_${dates[dates.length - 1]}` : ''}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Filtered CSV exported', 'success');
}

export function exportChartPng(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Chart saved as PNG', 'success');
}
