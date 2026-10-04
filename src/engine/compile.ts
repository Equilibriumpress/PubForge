import { stringify } from '@vivliostyle/vfm';

import type { LoadedProject } from '../lib/load-project';
import type { ContentEntry, ContentRole, PublicationManifest } from '../types/publication';

export interface CompiledChapter {
  index: number;
  sourcePath: string;
  outputPath: string;
  title: string;
  role: ContentRole;
  breakBefore?: ContentEntry['breakBefore'];
  pageCounterReset?: number;
  themePaths: string[];
  html: string;
}

export interface CompiledPublication {
  manifest: PublicationManifest;
  chapters: CompiledChapter[];
  themePaths: string[];
  assetPaths: string[];
}

export function resolveProjectPath(
  fromFile: string,
  reference: string,
): string | null {
  if (
    !reference ||
    reference.startsWith('#') ||
    /^[a-z][a-z0-9+.-]*:/i.test(reference) ||
    reference.startsWith('//')
  ) {
    return null;
  }

  const base = new URL(`https://pubforge.local/${fromFile}`);
  const resolved = new URL(reference, base);
  return decodeURIComponent(resolved.pathname.replace(/^\//, ''));
}

function sourceCandidates(resolvedPath: string): string[] {
  const candidates = [resolvedPath];
  if (/\.html?$/i.test(resolvedPath)) {
    const base = resolvedPath.replace(/\.html?$/i, '');
    candidates.push(`${base}.md`, `${base}.markdown`);
  }
  return candidates;
}

export function findChapterByResolvedPath(
  compiled: CompiledPublication,
  resolvedPath: string,
): CompiledChapter | undefined {
  const candidates = new Set(sourceCandidates(resolvedPath));
  return compiled.chapters.find((chapter) => candidates.has(chapter.sourcePath));
}

export function rewriteHtmlReferences(
  html: string,
  sourcePath: string,
  mapReference: (resolvedPath: string, original: string) => string | null,
): string {
  const document = new DOMParser().parseFromString(
    `<main id="pubforge-fragment">${html}</main>`,
    'text/html',
  );
  const root = document.getElementById('pubforge-fragment');
  if (!root) return html;

  for (const element of root.querySelectorAll<HTMLElement>('[src], [poster], [href]')) {
    for (const attribute of ['src', 'poster', 'href']) {
      const value = element.getAttribute(attribute);
      if (!value) continue;

      const [reference, hash = ''] = value.split('#', 2);
      const resolved = resolveProjectPath(sourcePath, reference);
      if (!resolved) continue;

      const mapped = mapReference(resolved, value);
      if (mapped) {
        const mappedContainsFragment = mapped.startsWith('#') || mapped.includes('#');
        element.setAttribute(
          attribute,
          hash && attribute === 'href' && !mappedContainsFragment
            ? `${mapped}#${hash}`
            : mapped,
        );
      }
    }
  }

  return root.innerHTML;
}

export function rewriteCssReferences(
  css: string,
  sourcePath: string,
  mapReference: (resolvedPath: string, original: string) => string | null,
): string {
  return css.replace(
    /url\((['"]?)([^)'"]+)\1\)/g,
    (full, _quote: string, value: string) => {
      const resolved = resolveProjectPath(sourcePath, value.trim());
      if (!resolved) return full;
      const mapped = mapReference(resolved, value.trim());
      return mapped ? `url("${mapped}")` : full;
    },
  );
}

function chapterTitle(html: string, fallback: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  return document.querySelector('h1, h2, h3')?.textContent?.trim() || fallback;
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

function ensureHeadingIds(html: string): string {
  const document = new DOMParser().parseFromString(
    `<main id="pubforge-fragment">${html}</main>`,
    'text/html',
  );
  const root = document.getElementById('pubforge-fragment');
  if (!root) return html;
  const seen = new Set<string>();
  for (const heading of Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'))) {
    const base = heading.id || slug(heading.textContent ?? 'section');
    let id = base;
    let suffix = 2;
    while (seen.has(id)) id = `${base}-${suffix++}`;
    heading.id = id;
    seen.add(id);
  }
  return root.innerHTML;
}

function outputName(index: number): string {
  return `text/chapter-${String(index + 1).padStart(3, '0')}.xhtml`;
}

function vfmOptions(manifest: PublicationManifest): Parameters<typeof stringify>[1] {
  const config = manifest.vfm ?? {};
  return {
    partial: true,
    math: config.math ?? true,
    mathRenderer: config.mathRenderer ?? 'mathml',
    footnote: config.footnote ?? 'dpub',
    hardLineBreaks: config.hardLineBreaks ?? false,
    imgFigcaptionOrder: config.imgFigcaptionOrder ?? 'img-figcaption',
    assignIdToFigcaption: config.assignIdToFigcaption ?? false,
    captionlessImagePolicy: config.captionlessImagePolicy ?? 'paragraph',
    parseFigcaptionAsInline: config.parseFigcaptionAsInline ?? false,
    rewriteRelativeHrefExtensions:
      config.rewriteRelativeHrefExtensions ?? true,
    table: { cell: config.tableCell ?? 'align-class' },
    disableFormatHtml: true,
  };
}

function globMatch(path: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^$(){}|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§§DOUBLESTAR§§')
    .replace(/\*/g, '[^/]*')
    .replace(/§§DOUBLESTAR§§/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`).test(path);
}
function collectReferencedResources(
  project: LoadedProject,
  chapters: CompiledChapter[],
  themePaths: string[],
): string[] {
  const resources = new Set<string>();
  const compiled = {
    manifest: project.manifest,
    chapters,
    themePaths,
    assetPaths: [],
  } satisfies CompiledPublication;

  const addIfResource = (resolved: string) => {
    if (findChapterByResolvedPath(compiled, resolved)) return;
    if (project.workspace.has(resolved)) resources.add(resolved);
  };

  if (project.manifest.cover?.image) {
    addIfResource(project.manifest.cover.image);
  }

  const allThemes = new Set(themePaths);
  if (project.manifest.epub?.theme) allThemes.add(project.manifest.epub.theme);
  for (const themePath of allThemes) {
    if (!project.workspace.has(themePath)) continue;
    resources.add(themePath);
    const css = project.workspace.text(themePath);
    for (const match of css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) {
      const resolved = resolveProjectPath(themePath, match[2].trim());
      if (resolved) addIfResource(resolved);
    }
  }

  for (const chapter of chapters) {
    const document = new DOMParser().parseFromString(
      `<main>${chapter.html}</main>`,
      'text/html',
    );
    for (const element of Array.from(
      document.querySelectorAll<HTMLElement>('[src], [poster], [href]'),
    )) {
      for (const attribute of ['src', 'poster', 'href']) {
        const value = element.getAttribute(attribute);
        if (!value || value.startsWith('#')) continue;
        const reference = value.split('#', 1)[0];
        const resolved = resolveProjectPath(chapter.sourcePath, reference);
        if (resolved) addIfResource(resolved);
      }
    }
  }

  for (const pattern of project.manifest.assets?.includes ?? []) {
    for (const path of project.workspace.list()) {
      if (globMatch(path, pattern)) addIfResource(path);
    }
  }

  const excludes = project.manifest.assets?.excludes ?? [];
  return [...resources]
    .filter((path) => !excludes.some((pattern) => globMatch(path, pattern)))
    .sort();
}

export function compilePublication(project: LoadedProject): CompiledPublication {
  const themePaths = new Set<string>([project.manifest.theme.css]);

  const chapters = project.manifest.readingOrder.map((entry, index) => {
    const markdown = project.workspace.text(entry.path);
    const html = ensureHeadingIds(stringify(markdown, vfmOptions(project.manifest)));
    const role = entry.role ?? 'chapter';
    const title = entry.title ?? chapterTitle(html, `Chapter ${index + 1}`);
    const entryThemes = [
      project.manifest.theme.css,
      ...(entry.theme ? [entry.theme] : []),
    ];
    for (const path of entryThemes) themePaths.add(path);

    return {
      index,
      sourcePath: entry.path,
      outputPath: outputName(index),
      title,
      role,
      breakBefore: entry.breakBefore,
      pageCounterReset: entry.pageCounterReset,
      themePaths: entryThemes,
      html,
    } satisfies CompiledChapter;
  });

  const compiledThemes = [...themePaths];
  const assetPaths = collectReferencedResources(
    project,
    chapters,
    compiledThemes,
  );

  return {
    manifest: project.manifest,
    chapters,
    themePaths: compiledThemes,
    assetPaths,
  };
}

export function roleToEpubType(role: ContentRole): string {
  switch (role) {
    case 'cover':
      return 'cover';
    case 'title-page':
      return 'titlepage';
    case 'copyright':
      return 'copyright-page';
    case 'toc':
      return 'toc';
    case 'preface':
      return 'preface';
    case 'appendix':
      return 'appendix';
    case 'bibliography':
      return 'bibliography';
    case 'colophon':
      return 'colophon';
    case 'chapter':
      return 'chapter';
    default:
      return 'bodymatter';
  }
}

export function publicationIdentifier(project: LoadedProject): string {
  return (
    project.manifest.publication.identifier ??
    `urn:pubforge:${project.snapshot.repository}:${project.snapshot.commitSha}`
  );
}
