import { state } from './state.js';
import { loadAllFromDB, clearDB } from './db.js';
import { loadLastImport, saveSettings, getFilterState } from './settings.js';
import { importCsvFile, importMultipleFiles, importFromClipboard, loadSampleData, loadTeamSampleData, exportFilteredCsv, exportChartPng, setImportCallback, isCsvLikeFile } from './csv.js';
import { initToasts, showToast, initTheme, toggleTheme, updateFreshnessLabel, setThemeChangeCallback } from './ui.js';
import {
  populateSlicers, updateSlicerOptions, applyFilters, applyPeriodPreset,
  resetFilters, restoreSettingsFromStorage, syncMetricGranUI,
} from './filters.js';
import { renderCostChart } from './charts.js';
import { renderAll, setMetric, setGranularity } from './render.js';
import { destroyTable } from './table.js';
import { initCommandPalette, setupDefaultCommands } from './command-palette.js';
import { startTour } from './tour.js';
import { listViews, saveView, deleteView, getView, renderViewsDropdown } from './views.js';
import { pickWatchFolder, stopWatchFolder, isFolderWatchSupported } from './folder-watch.js';
import { openPdfReport } from './insights.js';
import { initCompareDefaults, setupCompareControls } from './compare.js';

function setStorageLabel(count) {
  const el = document.getElementById('storage-label');
  const btn = document.getElementById('clear-data-btn');
  if (count > 0) {
    el.textContent = `${count.toLocaleString()} rows stored`;
    el.style.display = 'inline';
    btn.style.display = 'inline-flex';
  } else {
    el.style.display = 'none';
    btn.style.display = 'none';
  }
}

export function onDataLoaded(sourceLabel, added, skipped) {
  document.getElementById('file-label').textContent =
    `${sourceLabel} (+${added} new, ${state.rawData.length.toLocaleString()} total)`;
  setStorageLabel(state.rawData.length);
  restoreSettingsFromStorage();
  populateSlicers();
  updateSlicerOptions();
  initCompareDefaults();
  renderViewsDropdown(document.getElementById('saved-views-select'));
  applyFilters();
  updateFreshnessLabel();
  if (!localStorage.getItem('cursor-usage-tour-done')) {
    setTimeout(() => startTour(), 600);
  }
}

async function handleFiles(files, multi = false) {
  if (!files?.length) return;
  const csvFiles = [...files].filter(isCsvLikeFile);
  if (!csvFiles.length) {
    showToast('Please select a CSV or text file', 'error');
    return;
  }
  try {
    if (multi || csvFiles.length > 1) await importMultipleFiles(csvFiles);
    else await importCsvFile(csvFiles[0]);
  } catch (e) {
    showToast('Failed to import: ' + e.message, 'error');
    document.getElementById('file-label').textContent = 'Import failed';
  }
}

function setupDragDrop() {
  const zones = [document.getElementById('empty-state'), document.getElementById('drop-overlay')];
  zones.forEach(zone => {
    if (!zone) return;
    ['dragenter', 'dragover'].forEach(ev => {
      zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
      zone.addEventListener(ev, e => {
        e.preventDefault();
        if (ev === 'drop') handleFiles(e.dataTransfer.files, true);
        zone.classList.remove('drag-over');
      });
    });
  });
}

function applySavedView(name) {
  const view = getView(name);
  if (!view?.state) return;
  const s = view.state;
  if (s.dateFrom) document.getElementById('f-date-from').value = s.dateFrom;
  if (s.dateTo) document.getElementById('f-date-to').value = s.dateTo;
  if (s.metric) setMetric(s.metric);
  if (s.granularity) setGranularity(s.granularity);
  state.periodPreset = s.periodPreset || 'custom';
  document.querySelectorAll('#period-presets button').forEach(b =>
    b.classList.toggle('active', b.dataset.preset === state.periodPreset));
  ['ms-user', 'ms-kind', 'ms-model'].forEach(id => {
    document.querySelectorAll(`#${id} input[type="checkbox"]`).forEach(cb => { cb.checked = false; });
  });
  const applyChecks = (wrapperId, saved) => {
    if (!saved?.length) return;
    const set = new Set(saved);
    document.querySelectorAll(`#${wrapperId} .ms-dropdown input[type="checkbox"]`).forEach(cb => {
      if (set.has(cb.value)) cb.checked = true;
    });
  };
  applyChecks('ms-user', s.users);
  applyChecks('ms-kind', s.kinds);
  applyChecks('ms-model', s.models);
  updateSlicerOptions();
  applyFilters();
  showToast(`Loaded view "${name}"`, 'success');
}

function setupFilters() {
  document.getElementById('f-date-from').addEventListener('change', () => {
    state.periodPreset = 'custom';
    document.querySelectorAll('#period-presets button').forEach(b => b.classList.remove('active'));
    updateSlicerOptions();
    applyFilters();
  });
  document.getElementById('f-date-to').addEventListener('change', () => {
    state.periodPreset = 'custom';
    document.querySelectorAll('#period-presets button').forEach(b => b.classList.remove('active'));
    updateSlicerOptions();
    applyFilters();
  });

  document.getElementById('f-reset').addEventListener('click', () => resetFilters(true));
  document.getElementById('f-reset-all').addEventListener('click', () => resetFilters(false));

  document.querySelectorAll('#period-presets button').forEach(btn => {
    btn.addEventListener('click', () => applyPeriodPreset(btn.dataset.preset));
  });

  document.getElementById('metric-toggle').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    setMetric(btn.dataset.metric);
    saveSettings(getFilterState());
  });

  document.getElementById('granularity-toggle').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    setGranularity(btn.dataset.gran);
    saveSettings(getFilterState());
  });

  document.querySelectorAll('.kpi-card[data-metric]').forEach(card => {
    card.addEventListener('click', () => { setMetric(card.dataset.metric); saveSettings(getFilterState()); });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMetric(card.dataset.metric); saveSettings(getFilterState()); }
    });
  });

  document.getElementById('budget-input')?.addEventListener('change', () => {
    const v = parseFloat(document.getElementById('budget-input').value);
    state.budgetMonthly = isNaN(v) || v <= 0 ? null : v;
    saveSettings(getFilterState());
    if (state.rawData.length && state.metric === 'cost') renderCostChart();
  });

  document.getElementById('filter-toggle')?.addEventListener('click', () => {
    document.getElementById('filter-bar').classList.toggle('open');
  });

  document.getElementById('save-view-btn')?.addEventListener('click', () => {
    const name = prompt('Name this view:');
    if (!name?.trim()) return;
    saveView(name.trim(), getFilterState());
    renderViewsDropdown(document.getElementById('saved-views-select'));
    showToast(`Saved view "${name.trim()}"`, 'success');
  });

  document.getElementById('saved-views-select')?.addEventListener('change', e => {
    if (e.target.value) applySavedView(e.target.value);
    e.target.value = '';
  });

  document.getElementById('delete-view-btn')?.addEventListener('click', () => {
    const sel = document.getElementById('saved-views-select');
    const name = sel?.value || prompt('View name to delete:');
    if (!name) return;
    deleteView(name);
    renderViewsDropdown(sel);
    showToast(`Deleted view "${name}"`, 'info');
  });
}

async function init() {
  initToasts();
  initTheme();
  setThemeChangeCallback(() => {
    if (state.rawData.length) renderAll();
  });
  loadLastImport();
  updateFreshnessLabel();
  setImportCallback(onDataLoaded);

  document.getElementById('file-input').addEventListener('change', e => {
    handleFiles(e.target.files, e.target.multiple);
    e.target.value = '';
  });

  document.getElementById('file-input-multi')?.addEventListener('change', e => {
    handleFiles(e.target.files, true);
    e.target.value = '';
  });

  document.getElementById('load-sample-btn').addEventListener('click', async () => {
    try { await loadSampleData(); } catch (e) { showToast(e.message, 'error'); }
  });

  document.getElementById('load-team-sample-btn')?.addEventListener('click', async () => {
    try { await loadTeamSampleData(); } catch (e) { showToast(e.message, 'error'); }
  });

  document.getElementById('paste-csv-btn')?.addEventListener('click', async () => {
    try { await importFromClipboard(); } catch (e) { showToast(e.message, 'error'); }
  });
  document.getElementById('paste-csv-btn-empty')?.addEventListener('click', async () => {
    try { await importFromClipboard(); } catch (e) { showToast(e.message, 'error'); }
  });

  document.getElementById('watch-folder-btn')?.addEventListener('click', pickWatchFolder);
  document.getElementById('stop-watch-btn')?.addEventListener('click', stopWatchFolder);
  if (!isFolderWatchSupported()) {
    document.getElementById('watch-folder-btn')?.setAttribute('title', 'Requires Chrome/Edge');
  }

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('help-tour-btn')?.addEventListener('click', () => startTour(true));
  document.getElementById('cmd-hint-btn')?.addEventListener('click', () => window.openCommandPalette?.());

  document.getElementById('clear-data-btn').addEventListener('click', async () => {
    if (!confirm('Clear all stored data? This cannot be undone.')) return;
    stopWatchFolder();
    await clearDB();
    state.rawData = [];
    state.filteredData = [];
    state.hasUsers = false;
    state.hasTeamFields = false;
    destroyTable();
    setStorageLabel(0);
    document.getElementById('file-label').textContent = 'No file loaded';
    document.getElementById('date-range-badge').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    showToast('All stored data cleared', 'info');
  });

  document.getElementById('export-btn').addEventListener('click', exportFilteredCsv);
  document.getElementById('export-pdf-btn')?.addEventListener('click', openPdfReport);
  document.getElementById('export-chart-btn')?.addEventListener('click', () => {
    exportChartPng('cost-chart', 'cursor-usage-chart.png');
  });

  setupDragDrop();
  setupFilters();
  setupCompareControls(() => renderAll());

  initCommandPalette();
  setupDefaultCommands({
    loadSample: () => loadSampleData(),
    pasteClipboard: () => importFromClipboard(),
    exportCsv: exportFilteredCsv,
    exportPdf: openPdfReport,
    toggleTheme,
    startTour: () => startTour(true),
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  try {
    const rows = await loadAllFromDB();
    if (!rows.length) return;
    state.rawData = rows;
    state.hasUsers = state.rawData.some(r => r.user !== '');
    state.hasTeamFields = state.rawData.some(r => r.cloudAgentId || r.automationId);
    document.getElementById('file-label').textContent = 'Loaded from storage';
    setStorageLabel(rows.length);
    restoreSettingsFromStorage();
    populateSlicers();
    updateSlicerOptions();
    initCompareDefaults();
    renderViewsDropdown(document.getElementById('saved-views-select'));
    applyFilters();
    updateFreshnessLabel();
  } catch (e) {
    console.warn('Could not load from IndexedDB:', e);
  }
}

init();
