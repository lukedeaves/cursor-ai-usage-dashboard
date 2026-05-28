import { makeRowKey } from './utils.js';

const DB_NAME = 'cursor-usage-db';
const DB_VERSION = 1;
const DB_STORE = 'rows';

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const store = e.target.result.createObjectStore(DB_STORE, { autoIncrement: true });
      store.createIndex('rowKey', 'rowKey', { unique: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

export async function mergeRowsIntoDB(rows) {
  const db = await openDB();
  const tx = db.transaction(DB_STORE, 'readwrite');
  const store = tx.objectStore(DB_STORE);
  const index = store.index('rowKey');
  let added = 0;
  let skipped = 0;

  for (const r of rows) {
    const key = makeRowKey(r);
    const exists = await new Promise(res => {
      const q = index.getKey(key);
      q.onsuccess = e => res(e.target.result !== undefined);
      q.onerror = () => res(false);
    });
    if (!exists) {
      await new Promise(res => {
        const q = store.add({ ...r, rowKey: key });
        q.onsuccess = () => { added++; res(); };
        q.onerror = () => res();
      });
    } else {
      skipped++;
    }
  }
  return { added, skipped };
}

export async function loadAllFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

export async function clearDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}
