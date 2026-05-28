import { state } from './state.js';
import { loadAllFromDB, clearDB } from './db.js';
import { loadLastImport, saveSettings, getFilterState } from './settings.js';
import { importCsvFile, loadSampleData, exportFilteredCsv, exportChartPng, setImportCallback } from './csv.js';
import { initToasts, showToast, initTheme, toggleTheme, updateFreshnessLabel } from './ui.js';
import {
  populateSlicers, updateSlicerOptions, applyFilters, applyPeriodPreset,
  resetFilters, restoreSettingsFromStorage, syncMetricGranUI,
} from './filters.js';
import { renderCostChart } from './charts.js';
import { renderAll, setMetric, setGranularity } from './render.js';
import { destroyTable } from './table.js';

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
  applyFilters();
  updateFreshnessLabel();
}

async function handleFiles(files) {
  const file = files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('Please upload a CSV file', 'error');
    return;
  }
  try {
    await importCsvFile(file);
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
      zone.addEventListener(ev, e => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(ev => {
      zone.addEventListener(ev, e => {
        e.preventDefault();
        if (ev === 'drop') handleFiles(e.dataTransfer.files);
        zone.classList.remove('drag-over');
      });
    });
  });
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
    card.addEventListener('click', () => {
      setMetric(card.dataset.metric);
      saveSettings(getFilterState());
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setMetric(card.dataset.metric);
        saveSettings(getFilterState());
      }
    });
  });

  const budgetInput = document.getElementById('budget-input');
  budgetInput?.addEventListener('change', () => {
    const v = parseFloat(budgetInput.value);
    state.budgetMonthly = isNaN(v) || v <= 0 ? null : v;
    saveSettings(getFilterState());
    if (state.rawData.length && state.metric === 'cost') renderCostChart();
  });

  document.getElementById('filter-toggle')?.addEventListener('click', () => {
    document.getElementById('filter-bar').classList.toggle('open');
  });
}

async function init() {
  initToasts();
  initTheme();
  loadLastImport();
  updateFreshnessLabel();
  setImportCallback(onDataLoaded);

  document.getElementById('file-input').addEventListener('change', e => {
    handleFiles(e.target.files);
    e.target.value = '';
  });

  document.getElementById('load-sample-btn').addEventListener('click', async () => {
    try {
      await loadSampleData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  document.getElementById('clear-data-btn').addEventListener('click', async () => {
    if (!confirm('Clear all stored data? This cannot be undone.')) return;
    await clearDB();
    state.rawData = [];
    state.filteredData = [];
    state.hasUsers = false;
    destroyTable();
    setStorageLabel(0);
    document.getElementById('file-label').textContent = 'No file loaded';
    document.getElementById('date-range-badge').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    showToast('All stored data cleared', 'info');
  });

  document.getElementById('export-btn').addEventListener('click', exportFilteredCsv);
  document.getElementById('export-chart-btn')?.addEventListener('click', () => {
    exportChartPng('cost-chart', 'cursor-usage-chart.png');
  });

  setupDragDrop();
  setupFilters();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  try {
    const rows = await loadAllFromDB();
    if (!rows.length) return;
    state.rawData = rows;
    state.hasUsers = state.rawData.some(r => r.user !== '');
    document.getElementById('file-label').textContent = 'Loaded from storage';
    setStorageLabel(rows.length);
    restoreSettingsFromStorage();
    populateSlicers();
    updateSlicerOptions();
    applyFilters();
    updateFreshnessLabel();
  } catch (e) {
    console.warn('Could not load from IndexedDB:', e);
  }
}

init();
