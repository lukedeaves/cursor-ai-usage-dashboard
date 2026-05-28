const VIEWS_KEY = 'cursor-usage-saved-views';

export function listViews() {
  try {
    return JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveView(name, filterState) {
  const views = listViews().filter(v => v.name !== name);
  views.push({ name, state: filterState, savedAt: new Date().toISOString() });
  localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  return views;
}

export function deleteView(name) {
  const views = listViews().filter(v => v.name !== name);
  localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  return views;
}

export function getView(name) {
  return listViews().find(v => v.name === name) || null;
}

export function renderViewsDropdown(selectEl) {
  if (!selectEl) return;
  const views = listViews();
  selectEl.innerHTML = '<option value="">Saved views…</option>' +
    views.map(v => `<option value="${escapeAttr(v.name)}">${escapeHtml(v.name)}</option>`).join('');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s);
}
