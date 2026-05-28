#!/usr/bin/env python3
"""Run unit + E2E tests (Python + Playwright)."""

import os
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8899
BASE = f'http://127.0.0.1:{PORT}'


def start_server():
    return subprocess.Popen(
        [sys.executable, '-m', 'http.server', str(PORT)],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def wait_for_server(timeout=10):
    for _ in range(timeout * 10):
        try:
            urllib.request.urlopen(BASE + '/index.html', timeout=1)
            return True
        except Exception:
            time.sleep(0.1)
    return False


def run_unit_tests(page):
    page.goto(BASE + '/tests/unit-tests.html')
    page.wait_for_selector('#test-results[data-done="1"]', timeout=15000)
    failed = page.locator('#test-results .fail').count()
    passed = page.locator('#test-results .pass').count()
    print(f'Unit tests: {passed} passed, {failed} failed')
    return failed == 0


def run_e2e(page):
    page.goto(BASE + '/index.html')
    page.click('#load-sample-btn')
    page.wait_for_selector('#dashboard', state='visible', timeout=15000)
    page.wait_for_timeout(800)
    kpi = page.locator('#kpi-requests').inner_text()
    assert kpi and kpi != '—', 'KPI should load'
    assert page.locator('#insights-content .insight-card').count() > 0

    # Team CSV format
    page.goto(BASE + '/index.html')
    page.evaluate('() => { indexedDB.deleteDatabase("cursor-usage-db"); localStorage.clear(); }')
    page.reload()
    page.wait_for_selector('#load-team-sample-btn', state='visible', timeout=10000)
    page.click('#load-team-sample-btn')
    page.wait_for_selector('#dashboard', state='visible', timeout=15000)
    assert page.locator('#kpi-requests').inner_text() != '—'
    assert page.locator('#leaderboard-section').is_visible()

    # Theme toggle
    page.goto(BASE + '/index.html')
    html = page.locator('html')
    assert html.get_attribute('data-theme') in ('dark', 'light', None)
    page.click('#theme-toggle')
    page.wait_for_timeout(200)
    theme_after = html.get_attribute('data-theme')
    assert theme_after in ('dark', 'light')
    page.click('#theme-toggle')
    page.wait_for_timeout(200)
    assert html.get_attribute('data-theme') != theme_after

    print('E2E: sample data loaded, KPI=' + kpi)
    return True


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('Install dev deps: pip install -r requirements-dev.txt && playwright install chromium')
        sys.exit(1)

    srv = start_server()
    if not wait_for_server():
        srv.kill()
        print('Server failed to start')
        sys.exit(1)

    ok = True
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            context = browser.new_context(service_workers='block')
            page = context.new_page()
            ok = run_unit_tests(page) and run_e2e(page)
            browser.close()
    finally:
        srv.kill()

    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
