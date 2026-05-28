import { state } from './state.js';
import { applyRowFilters, buildMetricByBucket, bucketKey, getDateRange, getPeriodPresetRange, getPreviousPeriodRows, computeTotals, pctChange, PALETTE } from './utils.js';
import { saveSettings, clearSettings, getFilterState, loadSettings, readUrlState } from './settings.js';
import { renderAll } from './render.js';

export function getMsValues(wrapperId) {
  return Array.from(
    document.querySelectorAll(`#${wrapperId} .ms-dropdown input[type="checkbox"]:checked`)
  ).map(cb => cb.value);
}

export function updateMsTrigger(wrapperId) {
  const wrap = document.getElementById(wrapperId);
  if (!wrap) return;
  const placeholder = wrap.dataset.placeholder;
  const checked = getMsValues(wrapperId);
  const valueEl = wrap.querySelector('.ms-value');
  const badgeEl = wrap.querySelector('.ms-badge');
  if (!valueEl) return;

  if (checked.length === 0) {
    valueEl.textContent = placeholder;
    if (badgeEl) badgeEl.style.display = 'none';
  } else if (checked.length === 1) {
    valueEl.textContent = checked[0];
    if (badgeEl) badgeEl.style.display = 'none';
  } else {
    valueEl.textContent = placeholder;
    if (badgeEl) {
      badgeEl.textContent = checked.length;
      badgeEl.style.display = 'inline';
    }
  }
}

export function fillMsDropdown(wrapperId, values) {
  const wrap = document.getElementById(wrapperId);
  if (!wrap) return;

  if (!wrap.querySelector('.ms-trigger')) {
    const placeholder = wrap.dataset.placeholder;
    wrap.innerHTML = `
      <button type="button" class="ms-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="ms-value">${placeholder}</span>
        <span class="ms-badge" style="display:none"></span>
        <svg class="ms-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="2 4 6 8 10 4"/>
        </svg>
      </button>
      <div class="ms-dropdown" role="listbox">
        <input class="ms-search" type="text" placeholder="Search…" autocomplete="off" aria-label="Filter options" />
        <div class="ms-no-results">No matches</div>
      </div>`;

    const trigger = wrap.querySelector('.ms-trigger');
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.ms-wrap.open').forEach(w => {
        if (w !== wrap) closeMsDropdown(w);
      });
      const opening = !wrap.classList.contains('open');
      wrap.classList.toggle('open', opening);
      trigger.setAttribute('aria-expanded', String(opening));
      if (opening) {
        const search = wrap.querySelector('.ms-search');
        search.value = '';
        filterMsItems(wrap, '');
        search.focus();
      }
    });

    const searchEl = wrap.querySelector('.ms-search');
    searchEl.addEventListener('click', e => e.stopPropagation());
    searchEl.addEventListener('input', () => filterMsItems(wrap, searchEl.value));
    searchEl.addEventListener('keydown', e => handleMsKeydown(wrap, e));

    wrap.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMsDropdown(wrap);
    });
  }

  const prev = new Set(getMsValues(wrapperId));
  const panel = wrap.querySelector('.ms-dropdown');
  panel.querySelectorAll('.ms-item').forEach(el => el.remove());

  values.forEach(v => {
    const id = `cb-${wrapperId}-${v.replace(/[^\w]/g, '_')}`;
    const row = document.createElement('div');
    row.className = 'ms-item';
    row.setAttribute('role', 'option');
    row.innerHTML = `<input type="checkbox" id="${id}" value="${v.replace(/"/g, '&quot;')}"${prev.has(v) ? ' checked' : ''}>
                     <label for="${id}">${v}</label>`;
    row.querySelector('input').addEventListener('change', () => {
      updateMsTrigger(wrapperId);
      updateSlicerOptions();
      applyFilters();
    });
    panel.appendChild(row);
  });

  const searchEl = panel.querySelector('.ms-search');
  if (searchEl) filterMsItems(wrap, searchEl.value);
  updateMsTrigger(wrapperId);
}

function closeMsDropdown(wrap) {
  wrap.classList.remove('open');
  wrap.querySelector('.ms-trigger')?.setAttribute('aria-expanded', 'false');
  const s = wrap.querySelector('.ms-search');
  if (s) { s.value = ''; filterMsItems(wrap, ''); }
}

function filterMsItems(wrap, term) {
  const q = term.trim().toLowerCase();
  const items = wrap.querySelectorAll('.ms-item');
  let visible = 0;
  items.forEach(item => {
    const label = item.querySelector('label').textContent.toLowerCase();
    const show = !q || label.includes(q);
    item.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const nr = wrap.querySelector('.ms-no-results');
  if (nr) nr.style.display = visible === 0 ? 'block' : 'none';
}

function handleMsKeydown(wrap, e) {
  const items = [...wrap.querySelectorAll('.ms-item:not([style*="display: none"])')];
  if (!items.length) return;
  let idx = items.findIndex(i => i.classList.contains('focused'));
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    idx = Math.min(idx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    idx = Math.max(idx - 1, 0);
  } else if (e.key === 'Enter' && idx >= 0) {
    e.preventDefault();
    const cb = items[idx].querySelector('input');
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change'));
    return;
  } else return;
  items.forEach(i => i.classList.remove('focused'));
  items[idx]?.classList.add('focused');
}

export function populateSlicers() {
  const { from, to } = getDateRange(state.rawData);
  document.getElementById('f-date-from').value = from;
  document.getElementById('f-date-to').value = to;
  document.getElementById('filter-user-group').style.display = state.hasUsers ? '' : 'none';
  fillMsDropdown('ms-user', [...new Set(state.rawData.map(r => r.user).filter(Boolean))].sort());
  fillMsDropdown('ms-kind', [...new Set(state.rawData.map(r => r.kind).filter(Boolean))].sort());
  fillMsDropdown('ms-model', [...new Set(state.rawData.map(r => r.model).filter(Boolean))].sort());
}

export function updateSlicerOptions() {
  const from = document.getElementById('f-date-from').value;
  const to = document.getElementById('f-date-to').value;
  const users = getMsValues('ms-user');
  const kinds = getMsValues('ms-kind');
  const models = getMsValues('ms-model');
  const dateOk = r => (!from || r.date >= from) && (!to || r.date <= to);

  const forUser = state.rawData.filter(r => dateOk(r)
    && (!kinds.length || kinds.includes(r.kind))
    && (!models.length || models.includes(r.model)));
  const forKind = state.rawData.filter(r => dateOk(r)
    && (!users.length || users.includes(r.user))
    && (!models.length || models.includes(r.model)));
  const forModel = state.rawData.filter(r => dateOk(r)
    && (!users.length || users.includes(r.user))
    && (!kinds.length || kinds.includes(r.kind)));

  fillMsDropdown('ms-user', [...new Set(forUser.map(r => r.user).filter(Boolean))].sort());
  fillMsDropdown('ms-kind', [...new Set(forKind.map(r => r.kind).filter(Boolean))].sort());
  fillMsDropdown('ms-model', [...new Set(forModel.map(r => r.model).filter(Boolean))].sort());
}

export function applyFilters() {
  const from = document.getElementById('f-date-from').value;
  const to = document.getElementById('f-date-to').value;
  const users = getMsValues('ms-user');
  const kinds = getMsValues('ms-kind');
  const models = getMsValues('ms-model');

  state.filteredData = applyRowFilters(state.rawData, { from, to, users, kinds, models });
  saveSettings(getFilterState());
  renderAll();
}

export function applyPeriodPreset(preset) {
  state.periodPreset = preset;
  document.querySelectorAll('#period-presets button').forEach(b =>
    b.classList.toggle('active', b.dataset.preset === preset));
  const range = getPeriodPresetRange(preset, state.rawData);
  document.getElementById('f-date-from').value = range.from;
  document.getElementById('f-date-to').value = range.to;
  updateSlicerOptions();
  applyFilters();
}

export function resetFilters(keepMetricGran = true) {
  if (keepMetricGran) {
    const savedMetric = state.metric;
    const savedGran = state.granularity;
    clearSettings();
    ['ms-user', 'ms-kind', 'ms-model'].forEach(id => {
      document.querySelectorAll(`#${id} input[type="checkbox"]`).forEach(cb => { cb.checked = false; });
      updateMsTrigger(id);
    });
    state.periodPreset = 'all';
    document.querySelectorAll('#period-presets button').forEach(b =>
      b.classList.toggle('active', b.dataset.preset === 'all'));
    populateSlicers();
    state.metric = savedMetric;
    state.granularity = savedGran;
    syncMetricGranUI();
    saveSettings(getFilterState());
    applyFilters();
  } else {
    clearSettings();
    state.metric = 'requests';
    state.granularity = 'day';
    state.periodPreset = 'all';
    ['ms-user', 'ms-kind', 'ms-model'].forEach(id => {
      document.querySelectorAll(`#${id} input[type="checkbox"]`).forEach(cb => { cb.checked = false; });
      updateMsTrigger(id);
    });
    document.querySelectorAll('#period-presets button').forEach(b =>
      b.classList.toggle('active', b.dataset.preset === 'all'));
    populateSlicers();
    syncMetricGranUI();
    saveSettings(getFilterState());
    applyFilters();
  }
}

export function syncMetricGranUI() {
  document.querySelectorAll('#metric-toggle button').forEach(b =>
    b.classList.toggle('active', b.dataset.metric === state.metric));
  document.querySelectorAll('#granularity-toggle button').forEach(b =>
    b.classList.toggle('active', b.dataset.gran === state.granularity));
}

export function restoreSettingsFromStorage() {
  const url = readUrlState();
  const s = loadSettings() || {};
  const merged = { ...s, ...Object.fromEntries(Object.entries(url).filter(([, v]) => v && (Array.isArray(v) ? v.length : true))) };

  if (merged.dateTo) document.getElementById('f-date-to').value = merged.dateTo;
  if (merged.metric && ['cost', 'requests', 'tokens'].includes(merged.metric)) state.metric = merged.metric;
  if (merged.granularity && ['day', 'week', 'month'].includes(merged.granularity)) state.granularity = merged.granularity;
  if (merged.periodPreset) state.periodPreset = merged.periodPreset;
  if (merged.budgetMonthly != null) state.budgetMonthly = merged.budgetMonthly;

  syncMetricGranUI();
  document.querySelectorAll('#period-presets button').forEach(b =>
    b.classList.toggle('active', b.dataset.preset === state.periodPreset));

  const applyChecks = (wrapperId, saved) => {
    if (!saved?.length) return;
    const set = new Set(saved);
    document.querySelectorAll(`#${wrapperId} .ms-dropdown input[type="checkbox"]`).forEach(cb => {
      if (set.has(cb.value)) cb.checked = true;
    });
    updateMsTrigger(wrapperId);
  };
  applyChecks('ms-user', merged.users || url.users);
  applyChecks('ms-kind', merged.kinds || url.kinds);
  applyChecks('ms-model', merged.models || url.models);

  if (url.dateFrom) document.getElementById('f-date-from').value = url.dateFrom;
  if (merged.budgetMonthly != null) {
    const inp = document.getElementById('budget-input');
    if (inp) inp.value = merged.budgetMonthly;
  }
}

export function buildTokenComponentsByBucket(gran) {
  const components = {
    'Input (w/ Cache Write)': {},
    'Input (w/o Cache Write)': {},
    'Cache Read': {},
    'Output': {},
  };

  state.filteredData.forEach(r => {
    const key = bucketKey(r.date, gran);
    Object.keys(components).forEach(name => {
      if (!components[name][key]) components[name][key] = 0;
    });
    components['Input (w/ Cache Write)'][key] += r.inputCache;
    components['Input (w/o Cache Write)'][key] += r.inputNoCache;
    components['Cache Read'][key] += r.cacheRead;
    components['Output'][key] += r.output;
  });

  const totals = {};
  Object.keys(components).forEach(name => {
    totals[name] = Object.values(components[name]).reduce((sum, val) => sum + val, 0);
  });
  const sortedComponents = Object.keys(components).sort((a, b) => totals[b] - totals[a]);
  const allKeys = Object.keys(components[sortedComponents[0]] || {}).sort();

  return sortedComponents.map((name, idx) => ({
    label: name,
    data: allKeys.map(k => ({ x: k, y: components[name][k] || 0 })),
    borderColor: PALETTE[idx % PALETTE.length],
    backgroundColor: PALETTE[idx % PALETTE.length] + '80',
    borderWidth: 1.5,
    pointRadius: 0,
    fill: true,
    tension: 0.35,
    stack: 'tokens',
  }));
}

export { buildMetricByBucket, getPreviousPeriodRows, computeTotals, pctChange };

document.addEventListener('click', () => {
  document.querySelectorAll('.ms-wrap.open').forEach(closeMsDropdown);
});
