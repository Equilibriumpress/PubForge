import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

const [sourceDirArg, webpubDirArg, outputFileArg] = process.argv.slice(2);
if (!sourceDirArg || !webpubDirArg || !outputFileArg) {
  throw new Error(
    'Usage: node scripts/generate-press-config.mjs <publication-source> <prepared-webpub> <output.pdf>',
  );
}

const sourceDir = path.resolve(sourceDirArg);
const webpubDir = path.resolve(webpubDirArg);
const outputFile = path.resolve(outputFileArg);

const manifest = parse(
  await readFile(path.join(sourceDir, 'publication.yml'), 'utf8'),
);
const webpub = JSON.parse(
  await readFile(path.join(webpubDir, 'publication.json'), 'utf8'),
);

const production = manifest.pdf?.production ?? {};
if (production.enabled === false) {
  throw new Error('pdf.production.enabled is false for this publication.');
}

const readingOrder = Array.isArray(webpub.readingOrder) ? webpub.readingOrder : [];
if (!readingOrder.length) {
  throw new Error('Prepared WebPub does not contain a reading order.');
}

const sourceEntries = Array.isArray(manifest.readingOrder)
  ? manifest.readingOrder
  : [];

const entries = readingOrder.map((item, index) => {
  const source = sourceEntries[index] ?? {};
  const entry = {
    path: item.url,
    title: item.name ?? source.title,
  };

  if (['left', 'right', 'recto', 'verso'].includes(source.breakBefore)) {
    entry.pageBreakBefore = source.breakBefore;
  }
  if (Number.isInteger(source.pageCounterReset)) {
    entry.pageCounterReset = source.pageCounterReset;
  }
  return entry;
});

const pdf = manifest.pdf ?? {};
const metadata = manifest.publication ?? {};
const size =
  pdf.width && pdf.height
    ? `${pdf.width},${pdf.height}`
    : pdf.size ?? 'A4';

const pdfPostprocess = {
  preflight: production.preflight ?? 'press-ready-local',
  preflightOption: production.preflightOptions ?? [],
};

if (typeof production.cmyk === 'boolean') {
  pdfPostprocess.cmyk = production.cmyk;
}

if (production.outputIntent) {
  const sourceProfile = path.resolve(sourceDir, production.outputIntent);
  const profileDir = path.join(webpubDir, '.pubforge', 'press');
  await mkdir(profileDir, { recursive: true });
  const profileTarget = path.join(profileDir, path.basename(production.outputIntent));
  await copyFile(sourceProfile, profileTarget);
  pdfPostprocess.outputIntent = path.relative(webpubDir, profileTarget).split(path.sep).join('/');
}

const theme = [
  ...(manifest.theme?.packages ?? []),
  ...(manifest.theme?.css ? [manifest.theme.css] : []),
];

const config = {
  title: metadata.title,
  author: (metadata.authors ?? []).join(', '),
  language: metadata.language,
  readingProgression: metadata.readingProgression ?? 'ltr',
  entry: entries,
  theme,
  toc:
    manifest.contents?.toc === false
      ? false
      : {
          title: manifest.contents?.tocTitle ?? 'Contents',
          sectionDepth: manifest.contents?.sectionDepth ?? 1,
        },
  cover:
    manifest.cover?.image
      ? {
          src: manifest.cover.image,
          name: manifest.cover.alt ?? metadata.title,
        }
      : undefined,
  size,
  cropMarks: pdf.cropMarks ?? true,
  bleed: pdf.bleed ?? '3mm',
  cropOffset: pdf.cropOffset ?? 'auto',
  output: {
    path: path.relative(webpubDir, outputFile).split(path.sep).join('/'),
    format: 'pdf',
    pdfPostprocess,
  },
  timeout: 600000,
};

const configPath = path.join(webpubDir, 'vivliostyle.press.config.mjs');
await writeFile(
  configPath,
  `export default ${JSON.stringify(config, null, 2)};\n`,
);

const summary = {
  sourceDir,
  webpubDir,
  outputFile,
  configPath,
  preflight: pdfPostprocess.preflight,
  preflightOptions: pdfPostprocess.preflightOption,
  cmyk: pdfPostprocess.cmyk ?? null,
  outputIntent: pdfPostprocess.outputIntent ?? null,
  entries: entries.length,
};

await writeFile(
  path.join(webpubDir, 'pubforge-press-config.json'),
  JSON.stringify(summary, null, 2),
);

console.log(JSON.stringify(summary, null, 2));