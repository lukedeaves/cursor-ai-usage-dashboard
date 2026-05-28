# Browser Extension

A minimal Chrome/Edge extension to open the dashboard quickly and detect Cursor usage CSV downloads.

## Install (unpacked)

1. Run the dashboard locally: `make serve` from the repo root
2. Open `chrome://extensions` → Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Pin the extension and click **Open dashboard**

> For a packaged extension, host `index.html` on GitHub Pages and update `DASHBOARD_URL` in `background.js`.

## Permissions

- **downloads** — detects usage CSV downloads to offer opening the dashboard
