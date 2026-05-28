const CACHE = 'cursor-usage-v4';
const ASSETS = [
  './',
  './index.html',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/utils.js',
  './js/state.js',
  './js/db.js',
  './js/settings.js',
  './js/csv-fields.js',
  './js/ui.js',
  './js/filters.js',
  './js/render.js',
  './js/charts.js',
  './js/table.js',
  './css/features.css',
  './js/schema.js',
  './js/analytics.js',
  './js/insights.js',
  './js/compare.js',
  './js/views.js',
  './js/command-palette.js',
  './js/tour.js',
  './js/folder-watch.js',
  './js/csv-worker.js',
  './js/workers/csv-parse.worker.js',
  './tests/unit-tests.html',
  './vendor/papaparse.min.js',
  './vendor/chart.umd.min.js',
  './vendor/tabulator.min.css',
  './vendor/tabulator.min.js',
  './examples/sample_data.csv',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(res => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
