import type { LoadedProject } from '../lib/load-project';
import {
  compilePublication,
  findChapterByResolvedPath,
  rewriteCssReferences,
  rewriteHtmlReferences,
} from '../engine/compile';
import { mediaType } from '../export/utils';
import {
  buildPdfProfileCss,
  type PdfEdition,
} from '../engine/output-profile';

function asArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function namespaceCombinedChapter(html: string, prefix: string): string {
  const document = new DOMParser().parseFromString(
    `<main id="pubforge-fragment">${html}</main>`,
    'text/html',
  );
  const root = document.getElementById('pubforge-fragment');
  if (!root) return html;

  for (const element of Array.from(root.querySelectorAll<HTMLElement>('[id]'))) {
    element.id = `${prefix}-${element.id}`;
  }
  for (const link of Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))) {
    const href = link.getAttribute('href');
    if (href && href.length > 1) {
      link.setAttribute('href', `#${prefix}-${href.slice(1)}`);
    }
  }
  return root.innerHTML;
}

function tocChildren(
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
  prefix: string,
  depth: number,
): string {
  if (depth <= 1) return '';
  const document = new DOMParser().parseFromString(chapter.html, 'text/html');
  const selectors = Array.from(
    { length: Math.max(0, depth - 1) },
    (_, index) => `h${index + 2}[id]`,
  ).join(', ');
  if (!selectors) return '';

  const items = Array.from(document.querySelectorAll<HTMLElement>(selectors))
    .map((heading) => {
      const label = heading.textContent?.trim();
      if (!label) return '';
      return `<li class="toc-level-${heading.tagName.slice(1)}"><a href="#${prefix}-${escapeHtml(heading.id)}">${escapeHtml(label)}</a></li>`;
    })
    .filter(Boolean)
    .join('');

  return items ? `<ol class="pubforge-toc-sections">${items}</ol>` : '';
}

function buildToc(
  compiled: ReturnType<typeof compilePublication>,
  title: string,
  depth: number,
): string {
  const items = compiled.chapters
    .map((chapter) => {
      const prefix = `pubforge-chapter-${chapter.index + 1}`;
      return `<li><a href="#${prefix}">${escapeHtml(chapter.title)}</a>${tocChildren(chapter, prefix, depth)}</li>`;
    })
    .join('');
  return `<nav class="pubforge-toc" role="doc-toc"><h1>${escapeHtml(title)}</h1><ol>${items}</ol></nav>`;
}

function createObjectUrls(
  project: LoadedProject,
  paths: readonly string[],
): Map<string, string> {
  const urls = new Map<string, string>();
  for (const path of paths) {
    const data = project.workspace.read(path);
    urls.set(
      path,
      URL.createObjectURL(
        new Blob([asArrayBuffer(data)], { type: mediaType(path) }),
      ),
    );
  }
  return urls;
}

export interface PublicationDocument {
  html: string;
  url: string;
  dispose(): void;
}

export function buildPublicationDocument(
  project: LoadedProject,
  options: { edition?: PdfEdition } = {},
): PublicationDocument {
  const edition = options.edition ?? 'normal';
  const compiled = compilePublication(project);
  const objectUrls = createObjectUrls(project, compiled.assetPaths);
  const profileCss = buildPdfProfileCss(project.manifest, edition);
  const css = compiled.themePaths
    .map((path) =>
      rewriteCssReferences(
        project.workspace.text(path),
        path,
        (resolved) => objectUrls.get(resolved) ?? null,
      ),
    )
    .join('\n');

  const cover = project.manifest.cover?.image;
  const coverHtml =
    cover && project.workspace.has(cover)
      ? `<section class="pubforge-cover" epub:type="cover"><img src="${objectUrls.get(cover)}" alt="${escapeHtml(project.manifest.cover?.alt ?? project.manifest.title)}"></section>`
      : '';

  const tocHtml =
    project.manifest.contents?.toc === false
      ? ''
      : buildToc(
          compiled,
          project.manifest.contents?.tocTitle ?? 'Contents',
          project.manifest.contents?.sectionDepth ?? 1,
        );

  const chapters = compiled.chapters
    .map((chapter) => {
      const prefix = `pubforge-chapter-${chapter.index + 1}`;
      const namespaced = namespaceCombinedChapter(chapter.html, prefix);
      const body = rewriteHtmlReferences(
        namespaced,
        chapter.sourcePath,
        (resolved, original) => {
          const target = findChapterByResolvedPath(compiled, resolved);
          if (target) {
            const hash = original.includes('#') ? original.split('#', 2)[1] : '';
            return hash
              ? `#pubforge-chapter-${target.index + 1}-${hash}`
              : `#pubforge-chapter-${target.index + 1}`;
          }
          return objectUrls.get(resolved) ?? null;
        },
      );
      const style = [
        chapter.breakBefore ? `break-before:${chapter.breakBefore}` : '',
        chapter.pageCounterReset !== undefined
          ? `counter-reset:page ${chapter.pageCounterReset - 1}`
          : '',
        chapter.pageName ? `page:${chapter.pageName}` : '',
      ]
        .filter(Boolean)
        .join(';');
      const styleAttribute = style ? ` style="${style}"` : '';
      const layoutClass = chapter.layout
        ? ` pubforge-entry-layout-${chapter.layout}`
        : '';
      return `<section id="${prefix}" class="pubforge-chapter pubforge-role-${chapter.role}${layoutClass}" data-source="${escapeHtml(chapter.sourcePath)}" data-role="${chapter.role}" data-entry-layout="${chapter.layout ?? 'flow'}"${styleAttribute}>${body}</section>`;
    })
    .join('\n');

  const authors = project.manifest.publication.authors ?? [];
  const meta = project.manifest.publication;

  const html = `<!doctype html>
<html lang="${escapeHtml(meta.language)}" dir="${meta.readingProgression ?? 'ltr'}" data-pubforge-edition="${edition}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(meta.title)}</title>
<meta name="author" content="${escapeHtml(authors.join(', '))}">
${meta.identifier ? `<meta name="identifier" content="${escapeHtml(meta.identifier)}">` : ''}
${meta.publisher ? `<meta name="publisher" content="${escapeHtml(meta.publisher)}">` : ''}
${meta.description ? `<meta name="description" content="${escapeHtml(meta.description)}">` : ''}
<style>
html { background: white; }
body { margin: 0; }
.pubforge-cover { break-after: page; display: grid; place-items: center; min-height: 90vh; }
.pubforge-cover img { max-width: 100%; max-height: 90vh; object-fit: contain; }
.pubforge-toc { break-before: page; break-after: page; }
.pubforge-chapter:first-of-type { break-before: auto; }
${profileCss}
${css}
</style>
</head>
<body>
${coverHtml}
${tocHtml}
${chapters}
</body>
</html>`;

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));

  return {
    html,
    url,
    dispose() {
      URL.revokeObjectURL(url);
      for (const objectUrl of objectUrls.values()) URL.revokeObjectURL(objectUrl);
    },
  };
}
