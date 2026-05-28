# Cursor AI Usage Dashboard

A privacy-first web application for visualizing Cursor AI usage data, spending, and token consumption. Upload your CSV export to generate interactive charts, filter by date range/users/models, and analyze your AI usage patterns — all in your browser.

**Live demo:** Enable GitHub Pages in repo Settings → Pages (workflow included), or run locally with `make serve`.

## Features

- **CSV Import/Export** — Upload Cursor usage CSV files; export filtered data
- **Try sample data** — One-click demo with included example CSV
- **Drag & drop** — Drop CSV files anywhere on the page
- **Interactive charts** — Time series (cost/requests/tokens), model breakdown, token component stacks
- **KPI cards** — Totals with sparklines, count-up animation, and period-over-period deltas
- **Advanced filtering** — Date range, period presets, multi-select users/kinds/models, cascading options
- **Budget line** — Optional monthly budget overlay on the cost chart
- **URL state** — Shareable links preserve filter settings
- **Light/dark theme** — Manual toggle with system preference default
- **Offline-ready** — Vendored libraries + service worker caching
- **PWA** — Installable as a standalone app

## Screenshots

### Empty State
![Empty State](screenshots/empty_state.png)

### Dashboard with Data Loaded
![Loaded State](screenshots/loaded_state.png)

## Quick Start

### Option 1 — Open directly (simplest)

1. Clone or download this repository
2. Open `index.html` in a modern browser

> For full features (ES modules, service worker), use a local server (Option 2).

### Option 2 — Local server (recommended)

```bash
# Python (zero install on most systems)
make serve
# → http://localhost:8080

# Or with Node
make start
# → http://localhost:8080

# Or Docker
make docker
# → http://localhost:8080
```

### Option 3 — Try without your own data

1. Start the server
2. Click **Try sample data** on the welcome screen

## Usage Guide

### Getting your CSV

1. In Cursor: **Settings → Usage → Export**
2. Click **Import CSV** or drag the file onto the page

### Filtering

- **Period presets** — Last 7 days, Last 30 days, This month, All time
- **Date range** — Custom From/To pickers
- **Multi-select** — User, Kind, Model (with search)
- **Reset filters** — Clears filters but keeps metric/granularity
- **Reset all** — Clears everything including metric and granularity

### Metrics & charts

- Toggle **Requests / Cost / Tokens** in the filter bar, or click a KPI card
- Adjust time granularity: **Day / Week / Month**
- Set a **Budget $** value to show a budget line on the cost chart
- Click **Save PNG** to export the time-series chart

### Export & privacy

- **Export CSV** — Downloads currently filtered rows
- **Clear stored data** — Wipes IndexedDB (with confirmation)
- All processing is client-side; data never leaves your browser

## CSV Format

### Required columns

- `Date`, `Kind`, `Model`, `Max Mode`
- `Input (w/ Cache Write)`, `Input (w/o Cache Write)`, `Cache Read`
- `Output Tokens`, `Total Tokens`, `Cost`

### Optional

- `User` — Enables user filter when present

See [`examples/sample_data.csv`](examples/sample_data.csv) for an example.

## Development

```bash
npm install          # Install dev dependencies
npm test             # Run Vitest unit tests
npm run vendor       # Verify vendored libraries
npm run screenshots  # Regenerate README screenshots (requires Playwright)
```

### Project structure

```
├── index.html          # App shell
├── css/                # Design tokens, layout, components
├── js/                 # ES modules (app, charts, filters, csv, db, …)
├── vendor/             # Chart.js, Tabulator, Papa Parse (offline)
├── tests/              # Vitest tests
├── examples/           # Sample CSV data
├── sw.js               # Service worker
├── manifest.json       # PWA manifest
├── Makefile            # serve, test, docker shortcuts
└── docker-compose.yml  # nginx static server
```

See [`DEPENDENCIES.md`](DEPENDENCIES.md) for library versions and update instructions.

## Browser Compatibility

Requires a modern browser with:

- ES modules
- IndexedDB
- Canvas (Chart.js)

Tested in Chromium, Firefox, and Safari (latest).

## Deploy to GitHub Pages

Push to `main` — the included workflow (`.github/workflows/pages.yml`) deploys the static site automatically once GitHub Pages is enabled for the repository.

## Contributing

Contributions welcome! Run `npm test` before submitting a PR.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
