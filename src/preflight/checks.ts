import { strFromU8, unzipSync } from 'fflate';

import {
  compilePublication,
  resolveProjectPath,
} from '../engine/compile';
import { resolvePdfProfile } from '../engine/output-profile';
import { buildEpubArchive } from '../export/epub';
import type { LoadedProject } from '../lib/load-project';

export type PreflightSeverity = 'error' | 'warning' | 'info';

export interface PreflightIssue {
  severity: PreflightSeverity;
  category: 'project' | 'metadata' | 'content' | 'assets' | 'pdf' | 'epub';
  code: string;
  message: string;
  path?: string;
}

export interface PreflightReport {
  issues: PreflightIssue[];
  errors: number;
  warnings: number;
  info: number;
  ready: boolean;
}

function xmlDocument(source: string): Document {
  return new DOMParser().parseFromString(source, 'application/xml');
}

function hasXmlError(document: Document): boolean {
  return document.getElementsByTagName('parsererror').length > 0;
}

function equivalentSourceExists(project: LoadedProject, resolved: string): boolean {
  if (project.workspace.has(resolved)) return true;
  if (/\.html?$/i.test(resolved)) {
    const base = resolved.replace(/\.html?$/i, '');
    return (
      project.workspace.has(`${base}.md`) ||
      project.workspace.has(`${base}.markdown`)
    );
  }
  return false;
}

function add(
  issues: PreflightIssue[],
  severity: PreflightSeverity,
  category: PreflightIssue['category'],
  code: string,
  message: string,
  path?: string,
): void {
  issues.push({ severity, category, code, message, path });
}

function validateEpubPackage(project: LoadedProject, issues: PreflightIssue[]): void {
  if (project.manifest.epub?.enabled === false) return;

  try {
    const archive = buildEpubArchive(project);
    const files = unzipSync(archive);
    const required = [
      'mimetype',
      'META-INF/container.xml',
      'EPUB/package.opf',
      'EPUB/nav.xhtml',
    ];

    for (const path of required) {
      if (!files[path]) {
        add(issues, 'error', 'epub', 'epub-required-file', `EPUB is missing ${path}.`, path);
      }
    }

    if (files.mimetype) {
      const mime = strFromU8(files.mimetype);
      if (mime !== 'application/epub+zip') {
        add(issues, 'error', 'epub', 'epub-mimetype', 'EPUB mimetype entry is invalid.', 'mimetype');
      }
    }

    if (!files['EPUB/package.opf']) return;
    const opf = xmlDocument(strFromU8(files['EPUB/package.opf']));
    if (hasXmlError(opf)) {
      add(issues, 'error', 'epub', 'epub-opf-xml', 'EPUB package.opf is not well-formed XML.', 'EPUB/package.opf');
      return;
    }

    const manifestIds = new Set<string>();
    for (const item of Array.from(opf.getElementsByTagName('item'))) {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      if (id) manifestIds.add(id);
      if (href && !files[`EPUB/${href}`]) {
        add(
          issues,
          'error',
          'epub',
          'epub-manifest-resource',
          `EPUB manifest references a missing resource: ${href}.`,
          href,
        );
      }
    }

    for (const itemref of Array.from(opf.getElementsByTagName('itemref'))) {
      const idref = itemref.getAttribute('idref');
      if (idref && !manifestIds.has(idref)) {
        add(
          issues,
          'error',
          'epub',
          'epub-spine-idref',
          `EPUB spine references unknown manifest id: ${idref}.`,
        );
      }
    }

    const nav = files['EPUB/nav.xhtml'];
    if (nav) {
      const navSource = strFromU8(nav);
      const navDoc = xmlDocument(navSource);
      if (hasXmlError(navDoc)) {
        add(issues, 'error', 'epub', 'epub-nav-xml', 'EPUB navigation document is not well-formed XHTML.', 'EPUB/nav.xhtml');
      }
      if (
        project.manifest.contents?.pageList &&
        !navSource.includes('epub:type="page-list"')
      ) {
        add(
          issues,
          'warning',
          'epub',
          'epub-page-list-empty',
          'A page-list was requested but no semantic pagebreak markers were found.',
          'EPUB/nav.xhtml',
        );
      }
    }

    add(
      issues,
      'info',
      'epub',
      'epub-package-built',
      `EPUB package built and inspected successfully (${Object.keys(files).length} packaged files).`,
    );
  } catch (error) {
    add(
      issues,
      'error',
      'epub',
      'epub-build',
      error instanceof Error ? `EPUB build failed: ${error.message}` : 'EPUB build failed.',
    );
  }
}

export function runPreflight(project: LoadedProject): PreflightReport {
  const issues: PreflightIssue[] = [];
  const compiled = compilePublication(project);
  const metadata = project.manifest.publication;

  if (!metadata.authors?.length) {
    add(issues, 'warning', 'metadata', 'metadata-authors', 'No publication author is defined.');
  }
  if (!metadata.identifier) {
    add(issues, 'warning', 'metadata', 'metadata-identifier', 'No stable publication identifier/ISBN is defined.');
  }
  if (!metadata.publisher) {
    add(issues, 'warning', 'metadata', 'metadata-publisher', 'No publisher is defined.');
  }
  if (!metadata.description) {
    add(issues, 'warning', 'metadata', 'metadata-description', 'No publication description is defined.');
  }
  if (!metadata.rights) {
    add(issues, 'info', 'metadata', 'metadata-rights', 'No rights statement is defined.');
  }

  const seenSources = new Set<string>();
  for (const chapter of compiled.chapters) {
    if (seenSources.has(chapter.sourcePath)) {
      add(
        issues,
        'error',
        'content',
        'duplicate-reading-order',
        `Reading order contains ${chapter.sourcePath} more than once.`,
        chapter.sourcePath,
      );
    }
    seenSources.add(chapter.sourcePath);

    if (!project.workspace.has(chapter.sourcePath)) {
      add(issues, 'error', 'project', 'missing-content', 'Declared content file is missing.', chapter.sourcePath);
      continue;
    }

    const document = new DOMParser().parseFromString(
      `<main>${chapter.html}</main>`,
      'text/html',
    );
    if (!document.querySelector('h1, h2, h3')) {
      add(
        issues,
        'warning',
        'content',
        'missing-heading',
        'Chapter has no heading; navigation/title inference may be weak.',
        chapter.sourcePath,
      );
    }

    for (const image of Array.from(document.querySelectorAll('img'))) {
      const decorative =
        image.getAttribute('role') === 'presentation' ||
        image.getAttribute('aria-hidden') === 'true';
      if (
        !decorative &&
        (!image.hasAttribute('alt') || !image.getAttribute('alt')?.trim())
      ) {
        add(
          issues,
          'warning',
          'content',
          'image-alt',
          'Image has no useful alt text.',
          chapter.sourcePath,
        );
      }
    }

    for (const element of Array.from(document.querySelectorAll<HTMLElement>('[src], [poster], [href]'))) {
      for (const attribute of ['src', 'poster', 'href']) {
        const value = element.getAttribute(attribute);
        if (!value || value.startsWith('#')) continue;
        const reference = value.split('#', 1)[0];
        const resolved = resolveProjectPath(chapter.sourcePath, reference);
        if (!resolved) continue;
        if (!equivalentSourceExists(project, resolved)) {
          add(
            issues,
            'error',
            'assets',
            'missing-reference',
            `Reference cannot be resolved: ${value}`,
            chapter.sourcePath,
          );
        }
      }
    }
  }

  const ids = new Map<string, string>();
  for (const chapter of compiled.chapters) {
    const document = new DOMParser().parseFromString(chapter.html, 'text/html');
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('[id]'))) {
      const id = element.id;
      const previous = ids.get(id);
      if (previous) {
        add(
          issues,
          'warning',
          'content',
          'duplicate-id',
          `Duplicate document id "${id}" also occurs in ${previous}.`,
          chapter.sourcePath,
        );
      } else {
        ids.set(id, chapter.sourcePath);
      }
    }
  }

  const themePaths = new Set(compiled.themePaths);
  for (const path of project.resolvedThemes.epub) themePaths.add(path);
  if (project.manifest.epub?.theme) themePaths.add(project.manifest.epub.theme);
  for (const path of themePaths) {
    if (!project.workspace.has(path)) {
      add(issues, 'error', 'assets', 'missing-theme', 'Theme stylesheet is missing.', path);
      continue;
    }
    const css = project.workspace.text(path);
    const expression = /url\((['"]?)([^)'"]+)\1\)/g;
    for (const match of css.matchAll(expression)) {
      const resolved = resolveProjectPath(path, match[2].trim());
      if (resolved && !project.workspace.has(resolved)) {
        add(
          issues,
          'error',
          'assets',
          'missing-css-resource',
          `Stylesheet references a missing resource: ${match[2].trim()}`,
          path,
        );
      }
    }
  }

  for (const metric of project.preparedAssets.editorialImages) {
    const spec = project.manifest.assets?.editorialImages?.[metric.key];
    if (!project.workspace.has(metric.path)) {
      add(
        issues,
        'error',
        'assets',
        'editorial-image-missing',
        `Editorial image "${metric.key}" references a missing source.`,
        metric.path,
      );
      continue;
    }
    if (!metric.decorative && !spec?.alt?.trim()) {
      add(
        issues,
        'warning',
        'assets',
        'editorial-image-alt',
        `Editorial image "${metric.key}" has no alt text.`,
        metric.path,
      );
    }
    if (
      metric.effectiveDpi !== undefined &&
      metric.effectiveDpi < metric.targetDpi
    ) {
      add(
        issues,
        'warning',
        'assets',
        'editorial-image-dpi',
        `Editorial image "${metric.key}" resolves to approximately ${Math.round(metric.effectiveDpi)} dpi at its declared print width; target is ${Math.round(metric.targetDpi)} dpi.`,
        metric.path,
      );
    }
  }

  if (project.manifest.cover?.image) {
    if (!project.workspace.has(project.manifest.cover.image)) {
      add(issues, 'error', 'assets', 'missing-cover', 'Cover image is missing.', project.manifest.cover.image);
    }
    if (!project.manifest.cover.alt?.trim()) {
      add(issues, 'warning', 'metadata', 'cover-alt', 'Cover image has no explicit alt text.', project.manifest.cover.image);
    }
  } else if (project.manifest.epub?.enabled !== false) {
    add(issues, 'warning', 'epub', 'epub-cover', 'EPUB has no cover image configured.');
  }

  const pdf = resolvePdfProfile(project.manifest);
  if (pdf.profile === 'press') {
    const production = project.manifest.pdf?.production;
    if (production?.enabled) {
      add(
        issues,
        'info',
        'pdf',
        'press-production-enabled',
        `Press-ready production is enabled via ${production.preflight ?? 'press-ready-local'}; browser PDF remains a preview while the production workflow creates the print artifact.`,
      );
      if (production.outputIntent && !project.workspace.has(production.outputIntent)) {
        add(
          issues,
          'error',
          'pdf',
          'missing-output-intent',
          'The configured ICC output-intent profile is missing from the project.',
          production.outputIntent,
        );
      }
    } else {
      add(
        issues,
        'warning',
        'pdf',
        'press-pdfx',
        'Press layout is configured, but no press-ready production pipeline is enabled.',
      );
    }
  }
  if (pdf.cropOffset !== 'auto') {
    add(
      issues,
      'info',
      'pdf',
      'crop-offset-production',
      `Crop offset ${pdf.cropOffset} is recorded for the production pipeline; browser print layout cannot guarantee printer-mark offset placement.`,
    );
  }
  if (project.manifest.pdf?.bookmarks) {
    add(
      issues,
      'info',
      'pdf',
      'pdf-bookmarks-production',
      'PDF bookmarks are requested; browser Save as PDF does not guarantee outline creation, so production QA/build should verify them.',
    );
  }
  if (pdf.cropMarks && pdf.bleed === '0mm') {
    add(
      issues,
      'warning',
      'pdf',
      'crop-without-bleed',
      'Crop marks are enabled while bleed is 0mm.',
    );
  }

  validateEpubPackage(project, issues);

  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  const info = issues.filter((issue) => issue.severity === 'info').length;

  return {
    issues,
    errors,
    warnings,
    info,
    ready: errors === 0,
  };
}
