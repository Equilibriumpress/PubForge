import { stringify } from '@vivliostyle/vfm';

import type { LoadedProject } from '../lib/load-project';
import { contentPath } from '../types/publication';

const MIME_TYPES: Record<string, string> = {
  css: 'text/css',
  gif: 'image/gif',
  html: 'text/html',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
};

function mimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

function asArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

function resolveProjectPath(fromFile: string, reference: string): string | null {
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

function createAssetUrls(project: LoadedProject): Map<string, string> {
  const urls = new Map<string, string>();
  for (const [path, data] of project.workspace.entries()) {
    urls.set(
      path,
      URL.createObjectURL(new Blob([asArrayBuffer(data)], { type: mimeType(path) })),
    );
  }
  return urls;
}

function rewriteHtmlAssets(
  html: string,
  sourcePath: string,
  assetUrls: Map<string, string>,
): string {
  const document = new DOMParser().parseFromString(
    `<main id="pubforge-fragment">${html}</main>`,
    'text/html',
  );
  const root = document.getElementById('pubforge-fragment');
  if (!root) return html;

  for (const element of root.querySelectorAll<HTMLElement>('[src], [poster]')) {
    for (const attribute of ['src', 'poster']) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const resolved = resolveProjectPath(sourcePath, value);
      if (resolved && assetUrls.has(resolved)) {
        element.setAttribute(attribute, assetUrls.get(resolved)!);
      }
    }
  }

  return root.innerHTML;
}

function rewriteCssUrls(
  css: string,
  sourcePath: string,
  assetUrls: Map<string, string>,
): string {
  return css.replace(/url\((['"]?)([^)'"]+)\1\)/g, (full, _quote: string, value: string) => {
    const resolved = resolveProjectPath(sourcePath, value.trim());
    if (!resolved || !assetUrls.has(resolved)) return full;
    return `url("${assetUrls.get(resolved)}")`;
  });
}

export interface PublicationDocument {
  html: string;
  url: string;
  dispose(): void;
}

export function buildPublicationDocument(project: LoadedProject): PublicationDocument {
  const assetUrls = createAssetUrls(project);
  const themeCss = rewriteCssUrls(
    project.workspace.text(project.manifest.theme.css),
    project.manifest.theme.css,
    assetUrls,
  );

  const chapters = project.manifest.content.map((entry) => {
    const path = contentPath(entry);
    const markdown = project.workspace.text(path);
    const partial = stringify(markdown, {
      partial: true,
      math: false,
      disableFormatHtml: true,
    });
    const body = rewriteHtmlAssets(partial, path, assetUrls);
    const breakBefore =
      typeof entry === 'string' ? undefined : entry.breakBefore;

    return `<section class="pubforge-chapter" data-source="${path}"${breakBefore ? ` style="break-before:${breakBefore}"` : ''}>${body}</section>`;
  });

  const author = Array.isArray(project.manifest.author)
    ? project.manifest.author.join(', ')
    : project.manifest.author ?? '';

  const html = `<!doctype html>
<html lang="${project.manifest.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${project.manifest.title}</title>
<meta name="author" content="${author}">
<style>
html { background: white; }
body { margin: 0; }
.pubforge-chapter:first-child > section:first-child,
.pubforge-chapter:first-child > h1:first-child { break-before: auto; }
${themeCss}
</style>
</head>
<body>
${chapters.join('\n')}
</body>
</html>`;

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));

  return {
    html,
    url,
    dispose() {
      URL.revokeObjectURL(url);
      for (const assetUrl of assetUrls.values()) {
        URL.revokeObjectURL(assetUrl);
      }
    },
  };
}
