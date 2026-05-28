import { showToast } from './ui.js';

const COMMANDS = [];

export function registerCommand(cmd) {
  COMMANDS.push(cmd);
}

export function initCommandPalette() {
  const overlay = document.getElementById('cmd-palette');
  const input = document.getElementById('cmd-input');
  const list = document.getElementById('cmd-list');
  if (!overlay || !input || !list) return;

  document.addEventListener('keydown', e => {
    if (e.key === '/' && !isInputFocused()) {
      e.preventDefault();
      openPalette();
    }
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closePalette();
    }
  });

  input.addEventListener('input', () => renderList(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const active = list.querySelector('.cmd-item.active');
      if (active) active.click();
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      navigateList(e.key === 'ArrowDown' ? 1 : -1);
    }
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closePalette();
  });

  function openPalette() {
    overlay.classList.add('open');
    input.value = '';
    renderList('');
    input.focus();
  }

  function closePalette() {
    overlay.classList.remove('open');
  }

  function renderList(q) {
    const term = q.trim().toLowerCase();
    const matches = COMMANDS.filter(c =>
      !term || c.label.toLowerCase().includes(term) || c.keywords?.some(k => k.includes(term))
    );
    list.innerHTML = matches.map((c, i) =>
      `<button type="button" class="cmd-item${i === 0 ? ' active' : ''}" data-id="${c.id}">${c.label}</button>`
    ).join('') || '<div class="cmd-empty">No commands found</div>';

    list.querySelectorAll('.cmd-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = COMMANDS.find(c => c.id === btn.dataset.id);
        closePalette();
        cmd?.action();
      });
    });
  }

  function navigateList(dir) {
    const items = [...list.querySelectorAll('.cmd-item')];
    if (!items.length) return;
    const idx = items.findIndex(i => i.classList.contains('active'));
    items[idx]?.classList.remove('active');
    const next = Math.max(0, Math.min(items.length - 1, idx + dir));
    items[next]?.classList.add('active');
  }

  window.openCommandPalette = openPalette;
}

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export function setupDefaultCommands(handlers) {
  const cmds = [
    { id: 'import', label: 'Import CSV', keywords: ['upload', 'file'], action: () => document.getElementById('file-input')?.click() },
    { id: 'sample', label: 'Load sample data', keywords: ['demo', 'example'], action: handlers.loadSample },
    { id: 'paste', label: 'Import from clipboard', keywords: ['clipboard', 'paste'], action: handlers.pasteClipboard },
    { id: 'export-csv', label: 'Export filtered CSV', keywords: ['download'], action: handlers.exportCsv },
    { id: 'export-pdf', label: 'Print PDF report', keywords: ['report', 'print'], action: handlers.exportPdf },
    { id: 'theme', label: 'Toggle light/dark theme', keywords: ['dark', 'light'], action: handlers.toggleTheme },
    { id: 'tour', label: 'Start guided tour', keywords: ['help', 'guide'], action: handlers.startTour },
    { id: 'filters', label: 'Open filters', keywords: ['filter'], action: () => document.getElementById('filter-bar')?.classList.add('open') },
  ];
  cmds.forEach(registerCommand);
}
