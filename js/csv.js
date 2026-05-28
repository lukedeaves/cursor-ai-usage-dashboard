import { parseCsvRows } from './utils.js';
import { mergeRowsIntoDB, loadAllFromDB } from './db.js';
import { state } from './state.js';
import { saveLastImport } from './settings.js';
import { showToast } from './ui.js';

let onImportComplete = null;
export function setImportCallback(fn) { onImportComplete = fn; }

export async function importCsvText(text, sourceLabel = 'CSV') {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      async complete(results) {
        try {
          const parsed = parseCsvRows(results.data);
          if (!parsed.length) {
            reject(new Error('No valid rows found in CSV'));
            return;
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
            state.rawData = parsed;
          }
          state.hasUsers = state.rawData.some(r => r.user !== '');
          saveLastImport();
          showToast(
            `Imported ${sourceLabel}: +${added.toLocaleString()} new · ${skipped.toLocaleString()} duplicates skipped · ${state.rawData.length.toLocaleString()} total`,
            'success'
          );
          if (onImportComplete) onImportComplete(sourceLabel, added, skipped);
          resolve({ added, skipped, total: state.rawData.length });
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
  const label = document.getElementById('file-label');
  if (label) label.textContent = `Parsing ${file.name}…`;
  const text = await file.text();
  return importCsvText(text, file.name);
}

export async function loadSampleData() {
  const label = document.getElementById('file-label');
  if (label) label.textContent = 'Loading sample data…';
  const res = await fetch('examples/sample_data.csv');
  if (!res.ok) throw new Error('Could not load sample data');
  const text = await res.text();
  return importCsvText(text, 'sample data');
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
  const url = URL.createObjectURL(blob);
  link.href = url;
  const dates = state.filteredData.map(r => r.date).filter(Boolean).sort();
  const dateStr = dates.length ? `_${dates[0]}_to_${dates[dates.length - 1]}` : '';
  link.download = `cursor-usage${dateStr}.csv`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
