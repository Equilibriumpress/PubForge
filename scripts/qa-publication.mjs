import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PUBFORGE_URL ?? 'http://127.0.0.1:4173/';
const target = process.env.PUBFORGE_REPO;
const outputDir = process.env.PUBFORGE_QA_DIR ?? 'qa-output';
const editions = (process.env.PDF_EDITIONS ?? 'normal,print,high-quality')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);


async function waitForRenderer(page) {
  const output = page.getByRole('button', { name: 'Output' });
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline) {
    if (await output.isVisible().catch(() => false)) return;

    const status = await page.locator('[role="status"]').last().textContent().catch(() => null);
    if (
      status &&
      !/Reading publication snapshot|Preparing publication assets|Open a public GitHub publication repository/i.test(status)
    ) {
      throw new Error(`PubForge failed to load publication: ${status.trim()}`);
    }

    await page.waitForTimeout(500);
  }

  throw new Error('Timed out waiting for PubForge Output view.');
}

if (!target) {
  throw new Error('PUBFORGE_REPO must be owner/repo@ref.');
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1440, height: 1000 },
});

const publicationUrl = new URL(baseUrl);
publicationUrl.searchParams.set('repo', target);

const page = await context.newPage();
await page.goto(publicationUrl.href, {
  waitUntil: 'domcontentloaded',
  timeout: 120_000,
});
await waitForRenderer(page);
await page.getByRole('button', { name: 'Output' }).click();
const epubTargets = [
  { button: 'Export reflowable EPUB', file: 'publication-reflowable.epub', edition: 'reflowable' },
  { button: 'Export fixed EPUB', file: 'publication-fixed.epub', edition: 'fixed' },
];

const generatedEpubEditions = [];
for (const targetEpub of epubTargets) {
  const button = page.getByRole('button', { name: targetEpub.button });
  if (!(await button.isVisible().catch(() => false))) continue;

  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
  await button.click();
  const epub = await downloadPromise;
  await epub.saveAs(path.join(outputDir, targetEpub.file));
  generatedEpubEditions.push(targetEpub.edition);
}

if (generatedEpubEditions.length === 0) {
  const legacyButton = page.getByRole('button', { name: 'Export EPUB' });
  await legacyButton.waitFor({ state: 'visible', timeout: 60_000 });
  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
  await legacyButton.click();
  const epub = await downloadPromise;
  await epub.saveAs(path.join(outputDir, 'publication.epub'));
  generatedEpubEditions.push('default');
}

const summary = {
  target,
  baseUrl,
  editions,
  epubEditions: generatedEpubEditions,
  generatedAt: new Date().toISOString(),
};

for (const edition of editions) {
  const printPage = await context.newPage();
  await printPage.addInitScript(() => {
    window.print = () => {};
  });

  const printUrl = new URL(baseUrl);
  printUrl.searchParams.set('repo', target);
  printUrl.searchParams.set('print', '1');
  printUrl.searchParams.set('edition', edition);

  await printPage.goto(printUrl.href, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });

  await printPage.waitForFunction(
    (expected) => document.title.endsWith(` · ${expected}`),
    edition,
    { timeout: 180_000 },
  );

  await printPage.emulateMedia({ media: 'print' });
  await printPage.pdf({
    path: path.join(outputDir, `publication-${edition}.pdf`),
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,
    outline: true,
  });
  await printPage.close();
}

await writeFile(
  path.join(outputDir, 'browser-build.json'),
  JSON.stringify(summary, null, 2),
);

await page.close();
await context.close();
await browser.close();