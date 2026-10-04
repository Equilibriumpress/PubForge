import { stringify } from '@vivliostyle/vfm';

import type { LoadedProject } from '../lib/load-project';
import { contentPath } from '../types/publication';

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

function rewriteFragment(html: string, sourcePath: string): string {
  const document = new DOMParser().parseFromString(
    `<main id="fragment">${html}</main>`,
    'text/html',
  );
  const root = document.getElementById('fragment');
  if (!root) return html;

  for (const element of root.querySelectorAll<HTMLElement>('[src], [poster]')) {
    for (const attribute of ['src', 'poster']) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const resolved = resolveProjectPath(sourcePath, value);
      if (resolved) element.setAttribute(attribute, resolved);
    }
  }

  return root.innerHTML;
}

function rewriteCss(css: string, sourcePath: string): string {
  return css.replace(/url\((['"]?)([^)'"]+)\1\)/g, (full, _quote: string, value: string) => {
    const resolved = resolveProjectPath(sourcePath, value.trim());
    return resolved ? `url("${resolved}")` : full;
  });
}

export function buildPortableHtml(project: LoadedProject): string {
  const chapters = project.manifest.content.map((entry) => {
    const path = contentPath(entry);
    const fragment = stringify(project.workspace.text(path), {
      partial: true,
      math: false,
      disableFormatHtml: true,
    });
    const body = rewriteFragment(fragment, path);
    const breakBefore = typeof entry === 'string' ? undefined : entry.breakBefore;
    return `<section class="pubforge-chapter"${breakBefore ? ` style="break-before:${breakBefore}"` : ''}>${body}</section>`;
  });

  const css = rewriteCss(
    project.workspace.text(project.manifest.theme.css),
    project.manifest.theme.css,
  );

  return `<!doctype html>
<html lang="${project.manifest.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${project.manifest.title}</title>
<style>${css}</style>
</head>
<body>
${chapters.join('\n')}
</body>
</html>`;
}
