import type { LoadedProject } from '../lib/load-project';
import {
  compilePublication,
  rewriteCssReferences,
  rewriteHtmlReferences,
} from '../engine/compile';
import { mediaType } from '../export/utils';
import { buildPdfProfileCss } from '../engine/output-profile';

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

function createObjectUrls(project: LoadedProject): Map<string, string> {
  const urls = new Map<string, string>();
  for (const [path, data] of project.workspace.entries()) {
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

export function buildPublicationDocument(project: LoadedProject): PublicationDocument {
  const compiled = compilePublication(project);
  const objectUrls = createObjectUrls(project);
  const chapterTargets = new Map(
    compiled.chapters.map((chapter) => [
      chapter.sourcePath,
      `#pubforge-chapter-${chapter.index + 1}`,
    ]),
  );

  const profileCss = buildPdfProfileCss(project.manifest);
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
      : `<nav class="pubforge-toc" role="doc-toc"><h1>Contents</h1><ol>${compiled.chapters
          .map(
            (chapter) =>
              `<li><a href="#pubforge-chapter-${chapter.index + 1}">${escapeHtml(chapter.title)}</a></li>`,
          )
          .join('')}</ol></nav>`;

  const chapters = compiled.chapters
    .map((chapter) => {
      const body = rewriteHtmlReferences(
        chapter.html,
        chapter.sourcePath,
        (resolved) =>
          chapterTargets.get(resolved) ??
          objectUrls.get(resolved) ??
          null,
      );
      const breakBefore = chapter.breakBefore
        ? ` style="break-before:${chapter.breakBefore}"`
        : '';
      return `<section id="pubforge-chapter-${chapter.index + 1}" class="pubforge-chapter pubforge-role-${chapter.role}" data-source="${escapeHtml(chapter.sourcePath)}" data-role="${chapter.role}"${breakBefore}>${body}</section>`;
    })
    .join('\n');

  const authors = project.manifest.publication.authors ?? [];
  const meta = project.manifest.publication;

  const html = `<!doctype html>
<html lang="${escapeHtml(meta.language)}">
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
