import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PUBFORGE_URL ?? 'http://127.0.0.1:4173/';
const target = process.env.PUBFORGE_REPO;
const output = process.env.PUBFORGE_WEBPUB ?? 'press-work/publication.webpub.zip';

if (!target) throw new Error('PUBFORGE_REPO must be owner/repo@ref.');

await mkdir(path.dirname(output), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();

page.on('console', (message) => {
  if (message.type() === 'error') {
    console.error(`[browser] ${message.text()}`);
  }
});

const url = new URL(baseUrl);
url.searchParams.set('repo', target);

await page.goto(url.href, {
  waitUntil: 'domcontentloaded',
  timeout: 120_000,
});
await page.getByRole('button', { name: 'Output' }).waitFor({
  state: 'visible',
  timeout: 180_000,
});
await page.getByRole('button', { name: 'Output' }).click();

const button = page.getByRole('button', { name: 'Export WebPub' });
await button.waitFor({ state: 'visible', timeout: 60_000 });

const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
await button.click();
const download = await downloadPromise;
await download.saveAs(output);

await page.close();
await context.close();
await browser.close();