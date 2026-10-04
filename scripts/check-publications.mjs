import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, join, normalize, relative } from 'node:path';
import { parse } from 'yaml';

const root = process.cwd();

async function exists(path) {
  try {
    await access(join(root, path));
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await readdir(join(root, dir), { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const next = join(dir, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(next)));
    else paths.push(next.replaceAll('\\', '/'));
  }
  return paths;
}

function clean(path) {
  return normalize(path).replaceAll('\\', '/').replace(/^\.\//, '');
}

async function resolveDeclared(manifestPath, declared) {
  if (!declared) return null;
  const asRoot = clean(declared);
  if (await exists(asRoot)) return asRoot;

  const nested = clean(join(dirname(manifestPath), declared));
  if (await exists(nested)) return nested;

  return null;
}

const files = await walk('.');
const manifests = files
  .filter((path) => path === 'publication.yml' || path.endsWith('/publication.yml'))
  .sort();

let checked = 0;
const failures = [];

for (const manifestPath of manifests) {
  const source = await readFile(join(root, manifestPath), 'utf8');
  const manifest = parse(source);

  // Legacy fixture is intentionally excluded from the v2 launcher.
  if (manifest?.version !== 2) continue;
  checked += 1;

  const required = [];
  for (const entry of manifest.readingOrder ?? []) {
    required.push(['readingOrder', entry.path]);
    if (entry.theme) required.push(['entry theme', entry.theme]);
  }
  required.push(['theme', manifest.theme?.css]);
  if (manifest.cover?.image) required.push(['cover', manifest.cover.image]);
  if (manifest.cover?.page) required.push(['cover page', manifest.cover.page]);
  if (manifest.epub?.theme) required.push(['EPUB theme', manifest.epub.theme]);
  if (manifest.epub?.fixedTheme) required.push(['fixed EPUB theme', manifest.epub.fixedTheme]);
  if (manifest.pdf?.production?.outputIntent) {
    required.push(['ICC output intent', manifest.pdf.production.outputIntent]);
  }
  for (const [key, image] of Object.entries(manifest.assets?.editorialImages ?? {})) {
    required.push([`editorial image ${key}`, image.src]);
  }

  for (const [kind, declared] of required) {
    if (!declared) {
      failures.push(`${manifestPath}: missing declared ${kind} path`);
      continue;
    }
    const resolved = await resolveDeclared(manifestPath, declared);
    if (!resolved) {
      failures.push(`${manifestPath}: ${kind} not found: ${declared}`);
    }
  }

  console.log(
    `✓ ${manifestPath} — ${manifest.publication?.title ?? 'Untitled'}`,
  );
}

if (failures.length) {
  console.error('\nLayout showcase validation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nValidated ${checked} PubForge v2 publication manifests.`);
