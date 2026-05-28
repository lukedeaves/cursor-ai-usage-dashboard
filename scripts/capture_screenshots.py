#!/usr/bin/env python3
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8777

def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('pip install playwright && playwright install chromium')
        sys.exit(1)

    os.makedirs(os.path.join(ROOT, 'screenshots'), exist_ok=True)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1400, 'height': 900})
        page.goto(f'http://127.0.0.1:{PORT}/index.html')
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(ROOT, 'screenshots/empty_state.png'), full_page=True)
        page.click('#load-sample-btn')
        page.wait_for_selector('#dashboard', state='visible', timeout=10000)
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(ROOT, 'screenshots/loaded_state.png'), full_page=True)
        browser.close()

    srv.kill()
    print('Screenshots saved to screenshots/')


if __name__ == '__main__':
    main()
