/** Parse CSV text in a Web Worker for large files (non-blocking UI). */
const WORKER_THRESHOLD = 400_000; // ~400KB

export function shouldUseWorker(text) {
  return text.length > WORKER_THRESHOLD && typeof Worker !== 'undefined';
}

export function parseCsvInWorker(text) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('js/workers/csv-parse.worker.js');
    worker.onmessage = e => {
      worker.terminate();
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data);
    };
    worker.onerror = err => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage({ text });
  });
}
