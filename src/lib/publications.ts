import { parsePublicationManifest } from './manifest';
import { GitHubStorageProvider } from '../storage/github';
import type { PublicationManifest } from '../types/publication';
import type { RepositoryTarget } from './github-url';

export type PublicationKind = 'primary' | 'example' | 'starter';

export interface PublicationDescriptor {
  manifestPath: string;
  title: string;
  subtitle?: string;
  type?: string;
  language: string;
  kind: PublicationKind;
  outputs: string[];
}

export interface PublicationDiscovery {
  provider: GitHubStorageProvider;
  descriptors: PublicationDescriptor[];
}

function publicationKind(path: string): PublicationKind {
  if (path === 'publication.yml') return 'primary';
  if (path.startsWith('public/templates/')) return 'starter';
  return 'example';
}

export function manifestDirectory(manifestPath: string): string {
  const index = manifestPath.lastIndexOf('/');
  return index >= 0 ? manifestPath.slice(0, index) : '';
}

function normalizePath(path: string): string {
  const normalized = new URL(
    path.replace(/^\/+/, ''),
    'https://pubforge.local/',
  ).pathname;
  return decodeURIComponent(normalized.replace(/^\//, ''));
}

export function resolveManifestPath(
  provider: GitHubStorageProvider,
  manifestPath: string,
  declaredPath: string,
): string {
  const rootPath = normalizePath(declaredPath);
  if (provider.stat(rootPath)) return rootPath;

  const base = manifestDirectory(manifestPath);
  if (!base) return rootPath;

  const nestedPath = normalizePath(`${base}/${declaredPath}`);
  if (provider.stat(nestedPath)) return nestedPath;

  return rootPath;
}

export function resolveManifestPattern(
  provider: GitHubStorageProvider,
  manifestPath: string,
  pattern: string,
): string {
  const wildcardIndex = pattern.search(/[?*]/);
  if (wildcardIndex < 0) {
    return resolveManifestPath(provider, manifestPath, pattern);
  }

  const literalPrefix = pattern.slice(0, wildcardIndex);
  const normalizedRoot = normalizePath(literalPrefix);
  if (
    provider
      .list()
      .some((file) => file.path.startsWith(normalizedRoot))
  ) {
    return normalizePath(pattern);
  }

  const base = manifestDirectory(manifestPath);
  return base ? normalizePath(`${base}/${pattern}`) : normalizePath(pattern);
}

export function normalizeManifestPaths(
  manifest: PublicationManifest,
  manifestPath: string,
  provider: GitHubStorageProvider,
): PublicationManifest {
  const resolve = (path: string | undefined): string | undefined =>
    path ? resolveManifestPath(provider, manifestPath, path) : path;

  const readingOrder = manifest.readingOrder.map((entry) => ({
    ...entry,
    path: resolveManifestPath(provider, manifestPath, entry.path),
    theme: resolve(entry.theme),
  }));

  const normalized: PublicationManifest = {
    ...manifest,
    readingOrder,
    content: readingOrder,
    cover: manifest.cover
      ? {
          ...manifest.cover,
          image: resolve(manifest.cover.image),
          page: resolve(manifest.cover.page),
        }
      : undefined,
    theme: {
      ...manifest.theme,
      css: resolveManifestPath(provider, manifestPath, manifest.theme.css),
    },
    assets: manifest.assets
      ? {
          ...manifest.assets,
          includes: manifest.assets.includes?.map((pattern) =>
            resolveManifestPattern(provider, manifestPath, pattern),
          ),
          excludes: manifest.assets.excludes?.map((pattern) =>
            resolveManifestPattern(provider, manifestPath, pattern),
          ),
          editorialImages: manifest.assets.editorialImages
            ? Object.fromEntries(
                Object.entries(manifest.assets.editorialImages).map(
                  ([key, image]) => [
                    key,
                    {
                      ...image,
                      src: resolveManifestPath(
                        provider,
                        manifestPath,
                        image.src,
                      ),
                    },
                  ],
                ),
              )
            : undefined,
        }
      : undefined,
    epub: manifest.epub
      ? {
          ...manifest.epub,
          theme: resolve(manifest.epub.theme),
          fixedTheme: resolve(manifest.epub.fixedTheme),
        }
      : undefined,
    pdf: manifest.pdf
      ? {
          ...manifest.pdf,
          production: manifest.pdf.production
            ? {
                ...manifest.pdf.production,
                outputIntent: resolve(manifest.pdf.production.outputIntent),
              }
            : undefined,
        }
      : undefined,
  };

  return normalized;
}

export async function discoverGitHubPublications(
  target: RepositoryTarget,
): Promise<PublicationDiscovery> {
  const provider = new GitHubStorageProvider(target);
  await provider.open();

  const manifests = provider
    .list()
    .map((file) => file.path)
    .filter(
      (path) =>
        path === 'publication.yml' ||
        path.endsWith('/publication.yml'),
    )
    .sort((a, b) => {
      if (a === 'publication.yml') return -1;
      if (b === 'publication.yml') return 1;
      return a.localeCompare(b);
    });

  if (manifests.length === 0) {
    throw new Error('This repository does not contain a publication.yml.');
  }

  const descriptors: PublicationDescriptor[] = [];
  for (const manifestPath of manifests) {
    try {
      const manifest = parsePublicationManifest(
        await provider.readText(manifestPath),
      );
      descriptors.push({
        manifestPath,
        title: manifest.publication.title,
        subtitle: manifest.publication.subtitle,
        type: manifest.publication.type,
        language: manifest.publication.language,
        kind: publicationKind(manifestPath),
        outputs: manifest.outputs,
      });
    } catch {
      // Invalid publication manifests are excluded from the launcher and will
      // still surface their exact parse error when addressed directly.
    }
  }

  if (descriptors.length === 0) {
    throw new Error('No valid PubForge publication manifests were found.');
  }

  return { provider, descriptors };
}
