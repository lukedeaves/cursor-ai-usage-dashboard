import { parseCsvRows, makeRowKey } from './utils.js';
import { mergeRowsIntoDB, loadAllFromDB } from './db.js';
import { state } from './state.js';
import { saveLastImport } from './settings.js';
import { showToast } from './ui.js';
import { validateCsvSchema } from './schema.js';
import { shouldUseWorker, parseCsvInWorker } from './csv-worker.js';

let onImportComplete = null;
export function setImportCallback(fn) { onImportComplete = fn; }

async function ingestParsedRows(parsed, schema, sourceLabel) {
  if (!parsed.length) throw new Error('No valid rows found in CSV');

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

  if (shouldUseWorker(text)) {
    const { rows, schema } = await parseCsvInWorker(text);
    return ingestParsedRows(rows, schema, sourceLabel);
  }

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      async complete(results) {
        try {
          const schema = validateCsvSchema(results.meta?.fields || []);
          const parsed = parseCsvRows(results.data);
          const result = await ingestParsedRows(parsed, schema, sourceLabel);
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
  return importCsvText(text, file.name);
}

export async function importMultipleFiles(fileList) {
  const files = [...fileList].filter(f => f.name.toLowerCase().endsWith('.csv'));
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

export function exportFilteredCsv() {
  if (!state.filteredData.length) return;

  const headers = state.hasUsers
    ? ['Date', 'User', 'Kind', 'Model', 'Max Mode', 'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read', 'Output Tokens', 'Total Tokens', 'Cost']
    : ['Date', 'Kind', 'Model', 'Max Mode', 'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read', 'Output Tokens', 'Total Tokens', 'Cost'];

  const rows = state.filteredData.map(r => {
    const base = [r.date, r.kind, r.model, r.maxMode, r.inputCache, r.inputNoCache, r.cacheRead, r.output, r.total, r.cost.toFixed(6)];
    return state.hasUsers ? [r.date, r.user, ...base.slice(1)] : base;
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
