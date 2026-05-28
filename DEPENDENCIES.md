# Third-Party Dependencies

Browser libraries are vendored locally under `vendor/` for offline use.

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [Papa Parse](https://www.papaparse.com/) | 5.4.1 | MIT | CSV parsing and export |
| [Chart.js](https://www.chartjs.org/) | 4.4.3 | MIT | Interactive charts |
| [Tabulator](https://tabulator.info/) | 6.2.1 | MIT | Sortable data table |

## External CDN

| Resource | Purpose |
|----------|---------|
| [Google Fonts — DM Sans](https://fonts.google.com/specimen/DM+Sans) | Typography |

## Dev dependencies (optional, Python only)

```bash
pip install -r requirements-dev.txt
playwright install chromium
```

Used for `make test` and `make screenshots`.

## Updating vendor files

```bash
cd vendor
curl -fsSL -o papaparse.min.js "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"
curl -fsSL -o chart.umd.min.js "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"
curl -fsSL -o tabulator.min.css "https://unpkg.com/tabulator-tables@6.2.1/dist/css/tabulator.min.css"
curl -fsSL -o tabulator.min.js "https://unpkg.com/tabulator-tables@6.2.1/dist/js/tabulator.min.js"
make vendor
```
