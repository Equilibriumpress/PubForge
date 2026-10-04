import type { PublicationManifest } from '../types/publication';
import type { ProjectWorkspace } from '../workspace/workspace';

interface ThemePackageJson {
  main?: string;
  style?: string;
  exports?: Record<string, unknown> | string;
  vivliostyle?: {
    theme?: {
      style?: string;
    };
  };
}

export interface ResolvedThemePackages {
  base: string[];
  epub: string[];
}

interface PackageRef {
  packageName: string;
  version?: string;
  subpath?: string;
}

function parsePackageRef(ref: string): PackageRef {
  const parts = ref.split('/').filter(Boolean);

  if (ref.startsWith('@')) {
    if (parts.length < 2) throw new Error(`Invalid scoped theme package: ${ref}`);
    const scope = parts[0];
    const nameVersion = parts[1];
    const versionAt = nameVersion.lastIndexOf('@');
    const name = versionAt > 0 ? nameVersion.slice(0, versionAt) : nameVersion;
    const version = versionAt > 0 ? nameVersion.slice(versionAt + 1) : undefined;
    return {
      packageName: `${scope}/${name}`,
      version,
      subpath: parts.slice(2).join('/') || undefined,
    };
  }

  const first = parts[0] ?? ref;
  const versionAt = first.lastIndexOf('@');
  return {
    packageName: versionAt > 0 ? first.slice(0, versionAt) : first,
    version: versionAt > 0 ? first.slice(versionAt + 1) : undefined,
    subpath: parts.slice(1).join('/') || undefined,
  };
}

function packageBase(ref: PackageRef): string {
  const version = ref.version ? `@${ref.version}` : '';
  return `https://cdn.jsdelivr.net/npm/${ref.packageName}${version}/`;
}

function exportString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  for (const key of ['browser', 'import', 'default', 'style']) {
    const nested = exportString(record[key]);
    if (nested) return nested;
  }
  return null;
}

async function packageCssUrl(refText: string): Promise<string> {
  const ref = parsePackageRef(refText);
  const base = packageBase(ref);
  const response = await fetch(new URL('package.json', base));
  if (!response.ok) {
    throw new Error(`Unable to resolve theme package ${refText} from jsDelivr.`);
  }
  const pkg = (await response.json()) as ThemePackageJson;
  const exportKey = ref.subpath ? `./${ref.subpath}` : '.';
  const exports =
    typeof pkg.exports === 'object' && pkg.exports
      ? exportString(pkg.exports[exportKey])
      : ref.subpath
        ? null
        : exportString(pkg.exports);

  let entry =
    exports ??
    (ref.subpath
      ? ref.subpath
      : pkg.vivliostyle?.theme?.style ?? pkg.style ?? pkg.main ?? 'theme.css');

  entry = entry.replace(/^\.\//, '');
  if (!/\.css(?:$|[?#])/i.test(entry) && ref.subpath && !exports) {
    entry = `${entry}.css`;
  }
  return new URL(entry, base).href;
}

function isPackageImport(value: string): boolean {
  return (
    !value.startsWith('.') &&
    !value.startsWith('/') &&
    !value.startsWith('http:') &&
    !value.startsWith('https:') &&
    !value.startsWith('data:')
  );
}

function safeKey(value: string): string {
  return value
    .replace(/^@/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fileName(url: string, index: number): string {
  const pathname = new URL(url).pathname;
  const raw = pathname.split('/').pop() || `asset-${index}`;
  const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${String(index).padStart(3, '0')}-${safe || 'asset'}`;
}

class ThemePackageResolver {
  private readonly cssCache = new Map<string, string>();
  private readonly assetCache = new Map<string, string>();
  private assetCounter = 0;

  constructor(
    private readonly workspace: ProjectWorkspace,
    private readonly rootKey: string,
  ) {}

  async resolve(packageRef: string): Promise<string> {
    const rootUrl = await packageCssUrl(packageRef);
    const css = await this.processCss(rootUrl);
    const path = `.pubforge/themes/${this.rootKey}/theme.css`;
    this.workspace.addVirtual(path, new TextEncoder().encode(css));
    return path;
  }

  private async processCss(url: string): Promise<string> {
    const cached = this.cssCache.get(url);
    if (cached !== undefined) return cached;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to fetch theme stylesheet ${url}.`);
    const source = await response.text();

    // Mark as seen before recursion to prevent import cycles.
    this.cssCache.set(url, '');

    const importPattern =
      /@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^'")\s;]+))\s*\)?([^;]*);/g;
    let cursor = 0;
    let expanded = '';

    for (const match of source.matchAll(importPattern)) {
      const index = match.index ?? 0;
      expanded += source.slice(cursor, index);
      const reference = match[1] ?? match[2] ?? match[3] ?? '';
      const condition = (match[4] ?? '').trim();
      const importedUrl = isPackageImport(reference)
        ? await packageCssUrl(reference)
        : new URL(reference, url).href;
      const importedCss = await this.processCss(importedUrl);
      expanded += condition
        ? `\n@media ${condition} {\n${importedCss}\n}\n`
        : `\n/* inlined: ${reference} */\n${importedCss}\n`;
      cursor = index + match[0].length;
    }
    expanded += source.slice(cursor);

    const rewritten = await this.rewriteAssets(expanded, url);
    this.cssCache.set(url, rewritten);
    return rewritten;
  }

  private async rewriteAssets(css: string, cssUrl: string): Promise<string> {
    const pattern = /url\((['"]?)([^)'"]+)\1\)/g;
    let cursor = 0;
    let output = '';

    for (const match of css.matchAll(pattern)) {
      const index = match.index ?? 0;
      output += css.slice(cursor, index);
      const value = match[2].trim();

      if (
        !value ||
        value.startsWith('data:') ||
        value.startsWith('#') ||
        value.startsWith('http:') ||
        value.startsWith('https:')
      ) {
        output += match[0];
        cursor = index + match[0].length;
        continue;
      }

      const absolute = new URL(value, cssUrl).href;
      let local = this.assetCache.get(absolute);
      if (!local) {
        const response = await fetch(absolute);
        if (!response.ok) {
          throw new Error(`Unable to fetch theme asset ${absolute}.`);
        }
        const name = fileName(absolute, ++this.assetCounter);
        local = `.pubforge/themes/${this.rootKey}/assets/${name}`;
        this.workspace.addVirtual(
          local,
          new Uint8Array(await response.arrayBuffer()),
        );
        this.assetCache.set(absolute, local);
      }

      const relative = local.replace(
        `.pubforge/themes/${this.rootKey}/`,
        '',
      );
      output += `url("${relative}")`;
      cursor = index + match[0].length;
    }

    output += css.slice(cursor);
    return output;
  }
}

export async function resolveThemePackages(
  workspace: ProjectWorkspace,
  manifest: PublicationManifest,
): Promise<ResolvedThemePackages> {
  const cache = new Map<string, string>();

  async function resolveList(refs: readonly string[]): Promise<string[]> {
    const paths: string[] = [];
    for (const ref of refs) {
      const existing = cache.get(ref);
      if (existing) {
        paths.push(existing);
        continue;
      }
      const resolver = new ThemePackageResolver(workspace, safeKey(ref));
      const path = await resolver.resolve(ref);
      cache.set(ref, path);
      paths.push(path);
    }
    return paths;
  }

  return {
    base: await resolveList(manifest.theme.packages ?? []),
    epub: await resolveList(manifest.epub?.themePackages ?? []),
  };
}
