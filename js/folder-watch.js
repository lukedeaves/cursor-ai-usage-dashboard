import { importCsvText } from './csv.js';
import { showToast } from './ui.js';

let watchHandle = null;
let pollTimer = null;
const seenFiles = new Map();

export function isFolderWatchSupported() {
  return 'showDirectoryPicker' in window;
}

export async function pickWatchFolder() {
  if (!isFolderWatchSupported()) {
    showToast('Folder watch requires Chrome or Edge (File System Access API)', 'error');
    return;
  }

  try {
    watchHandle = await window.showDirectoryPicker({ mode: 'read' });
    showToast(`Watching folder: ${watchHandle.name}`, 'success');
    updateWatchLabel(watchHandle.name);
    await scanFolder(true);
    pollTimer = setInterval(() => scanFolder(false), 15000);
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Could not access folder: ' + e.message, 'error');
  }
}

export function stopWatchFolder() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  watchHandle = null;
  seenFiles.clear();
  updateWatchLabel(null);
  showToast('Stopped watching folder', 'info');
}

async function scanFolder(isInitial) {
  if (!watchHandle) return;
  let imported = 0;

  for await (const entry of watchHandle.values()) {
    if (entry.kind !== 'file') continue;
    if (!entry.name.toLowerCase().endsWith('.csv')) continue;

    const file = await entry.getFile();
    const prev = seenFiles.get(entry.name);
    if (prev === file.lastModified) continue;
    seenFiles.set(entry.name, file.lastModified);

    try {
      const text = await file.text();
      await importCsvText(text, entry.name);
      imported++;
    } catch (e) {
      showToast(`Failed to import ${entry.name}: ${e.message}`, 'error');
    }
  }

  if (imported && !isInitial) {
    showToast(`Auto-imported ${imported} new CSV file(s)`, 'success');
  }
}

function updateWatchLabel(name) {
  const el = document.getElementById('folder-watch-label');
  if (!el) return;
  if (name) {
    el.textContent = `Watching: ${name}`;
    el.style.display = 'inline';
  } else {
    el.style.display = 'none';
  }
}
