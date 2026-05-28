# Cursor AI Usage Dashboard

A privacy-first web application for visualizing Cursor AI usage data, spending, and token consumption. Upload your CSV export to generate interactive charts, filter by date range/users/models, and analyze your AI usage patterns — all in your browser.

## Quick Start

```bash
git clone https://github.com/lukedeaves/cursor-ai-usage-dashboard.git
cd cursor-ai-usage-dashboard
make serve
```

Open **http://localhost:8080** and click **Try sample data** — or import your Cursor usage CSV.

> ES modules and the service worker require a local server. Do not open `index.html` directly via `file://`.

## Features

### Core
- CSV import/export, drag-and-drop, multi-file merge, clipboard paste
- Interactive charts (time series, model breakdown, token components)
- KPI cards with sparklines, count-up animation, period-over-period deltas
- Advanced filtering with period presets, cascading multi-selects, saved views
- IndexedDB persistence, URL-encoded filter state, light/dark theme

### Analytics
- **Spend forecasting** — projected end-of-month cost
- **Anomaly detection** — flags unusual cost/token spikes
- **Model efficiency** — cost per 1K tokens by model
- **Team leaderboard** — user rankings when CSV includes `User`
- **Work sessions** — clusters requests by 30-minute gaps
- **Period compare** — side-by-side charts for two date ranges

### UX
- Command palette (`/` key)
- Guided tour (first load)
- PDF report (print-friendly summary)
- Schema validation with warnings when Cursor CSV format changes
- Web Worker parsing for large CSV files

### Optional extras
- **Browser extension** — see `extension/README.md`
- **Desktop shell** — `make desktop` (optional pywebview)
- **PWA** — installable; works offline after first load

## Screenshots

![Empty State](screenshots/empty_state.png)

![Loaded State](screenshots/loaded_state.png)

## Usage

1. Export from Cursor: **Settings → Usage → Export**
2. Import via button, drag-and-drop, paste, multi-import, or folder watch (Chrome/Edge)
3. Use filters, insights, compare mode, and export CSV/PNG/PDF

Press **`/`** for the command palette.

## Development

```bash
make serve        # Start Python server on :8080
make test         # Unit + E2E tests (requires pip install -r requirements-dev.txt)
make vendor       # Verify vendored libraries
make screenshots  # Regenerate README screenshots
make desktop      # Optional native window (pip install pywebview)
```

### Project structure

```
├── index.html          # App shell
├── css/                # Styles
├── js/                 # ES modules
├── vendor/             # Chart.js, Tabulator, Papa Parse
├── tests/              # Browser-based unit tests
├── extension/          # Chrome extension (optional)
├── desktop/            # pywebview launcher (optional)
├── examples/           # Sample CSV
└── Makefile            # Python-only commands
```

## Deploy to GitHub Pages

Enable Pages in repo settings — workflow at `.github/workflows/pages.yml` deploys on push to `main`.

## Browser Compatibility

Modern browsers with ES modules, IndexedDB, and Canvas. Folder watch requires Chrome/Edge (File System Access API).

## License

GNU GPL v3.0 — see [LICENSE](LICENSE).
