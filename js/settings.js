import { state } from './state.js';

const SETTINGS_KEY = 'cursor-usage-settings';
const IMPORT_KEY = 'cursor-usage-last-import';

export function saveSettings(filterState) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      ...filterState,
      metric: state.metric,
      granularity: state.granularity,
      budgetMonthly: state.budgetMonthly,
      theme: document.documentElement.dataset.theme || 'dark',
    }));
  } catch { /* unavailable */ }
  syncUrlState(filterState);
}

export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); }
  catch { return null; }
}

export function clearSettings() {
  try { localStorage.removeItem(SETTINGS_KEY); } catch { /* noop */ }
}

export function saveLastImport() {
  state.lastImportAt = new Date().toISOString();
  try { localStorage.setItem(IMPORT_KEY, state.lastImportAt); } catch { /* noop */ }
}

export function loadLastImport() {
  try {
    state.lastImportAt = localStorage.getItem(IMPORT_KEY);
  } catch { /* noop */ }
}

export function syncUrlState(filterState) {
  if (typeof history === 'undefined') return;
  const params = new URLSearchParams();
  if (filterState.dateFrom) params.set('from', filterState.dateFrom);
  if (filterState.dateTo) params.set('to', filterState.dateTo);
  if (filterState.metric && filterState.metric !== 'requests') params.set('metric', filterState.metric);
  if (filterState.granularity && filterState.granularity !== 'day') params.set('gran', filterState.granularity);
  if (filterState.periodPreset && filterState.periodPreset !== 'all') params.set('preset', filterState.periodPreset);
  filterState.users?.forEach(u => params.append('user', u));
  filterState.kinds?.forEach(k => params.append('kind', k));
  filterState.models?.forEach(m => params.append('model', m));
  const qs = params.toString();
  const url = qs ? `${location.pathname}?${qs}` : location.pathname;
  history.replaceState(null, '', url);
}

export function readUrlState() {
  const params = new URLSearchParams(location.search);
  return {
    dateFrom: params.get('from') || '',
    dateTo: params.get('to') || '',
    users: params.getAll('user'),
    kinds: params.getAll('kind'),
    models: params.getAll('model'),
    metric: params.get('metric') || '',
    granularity: params.get('gran') || '',
    periodPreset: params.get('preset') || '',
  };
}

export function getFilterState() {
  return {
    dateFrom: document.getElementById('f-date-from')?.value || '',
    dateTo: document.getElementById('f-date-to')?.value || '',
    users: getMsValues('ms-user'),
    kinds: getMsValues('ms-kind'),
    models: getMsValues('ms-model'),
    metric: state.metric,
    granularity: state.granularity,
    periodPreset: state.periodPreset,
  };
}

function getMsValues(wrapperId) {
  return Array.from(
    document.querySelectorAll(`#${wrapperId} .ms-dropdown input[type="checkbox"]:checked`)
  ).map(cb => cb.value);
}
