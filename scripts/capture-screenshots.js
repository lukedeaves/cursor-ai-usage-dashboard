import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const PORT = 8765;
const BASE = `http://127.0.0.1:${PORT}`;

async function main() {
  mkdirSync(join('screenshots'), { recursive: true });

  const { spawn } = await import('child_process');
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  await new Promise(r => setTimeout(r, 800));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(BASE + '/index.html');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/empty_state.png', fullPage: true });

  await page.click('#load-sample-btn');
  await page.waitForSelector('#dashboard', { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/loaded_state.png', fullPage: true });

  await browser.close();
  server.kill();
  console.log('Screenshots saved to screenshots/');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
