import { strToU8, zipSync, type Zippable } from 'fflate';
import { stringify } from '@vivliostyle/vfm';

import type { LoadedProject } from '../lib/load-project';
import { contentPath } from '../types/publication';
import { downloadBytes, mediaType, slugify, xmlEscape } from './utils';

function resolveProjectPath(fromFile: string, reference: string): string | null {
  if (
    !reference ||
    reference.startsWith('#') ||
    /^[a-z][a-z0-9+.-]*:/i.test(reference) ||
    reference.startsWith('//')
  ) return null;

  const base = new URL(`https://pubforge.local/${fromFile}`);
  return decodeURIComponent(
    new URL(reference, base).pathname.replace(/^\//, ''),
  );
}

function toXhtml(
  fragment: string,
  sourcePath: string,
  title: string,
  language: string,
  cssPath: string,
): string {
  const document = documentImplementation();
  document.body.innerHTML = fragment;

  for (const element of document.body.querySelectorAll<HTMLElement>('[src], [poster]')) {
    for (const attribute of ['src', 'poster']) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const resolved = resolveProjectPath(sourcePath, value);
      if (resolved) element.setAttribute(attribute, `../${resolved}`);
    }
  }

  const body = document.body.innerHTML;
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${xmlEscape(language)}" xml:lang="${xmlEscape(language)}">
<head>
<title>${xmlEscape(title)}</title>
<link rel="stylesheet" type="text/css" href="../${xmlEscape(cssPath)}"/>
</head>
<body>${body}</body>
</html>`;
}

function documentImplementation(): Document {
  return window.document.implementation.createHTMLDocument('');
}

function safeId(path: string, index: number): string {
  return `res-${index}-${path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export function exportEpub(project: LoadedProject): void {
  const files: Zippable = {
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
  };

  files['META-INF/container.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const chapterItems: string[] = [];
  const spineItems: string[] = [];
  const navItems: string[] = [];

  project.manifest.content.forEach((entry, index) => {
    const sourcePath = contentPath(entry);
    const chapterId = `chapter-${index + 1}`;
    const chapterPath = `text/${chapterId}.xhtml`;
    const displayTitle =
      typeof entry === 'string' ? `Chapter ${index + 1}` : entry.title ?? `Chapter ${index + 1}`;
    const fragment = stringify(project.workspace.text(sourcePath), {
      partial: true,
      math: false,
      disableFormatHtml: true,
    });

    files[`EPUB/${chapterPath}`] = strToU8(
      toXhtml(
        fragment,
        sourcePath,
        displayTitle,
        project.manifest.language,
        project.manifest.theme.css,
      ),
    );
    chapterItems.push(
      `<item id="${chapterId}" href="${chapterPath}" media-type="application/xhtml+xml"/>`,
    );
    spineItems.push(`<itemref idref="${chapterId}"/>`);
    navItems.push(
      `<li><a href="${chapterPath}">${xmlEscape(displayTitle)}</a></li>`,
    );
  });

  const excluded = new Set([
    'publication.yml',
    ...project.manifest.content.map(contentPath),
  ]);
  const resourceItems: string[] = [];
  let resourceIndex = 0;

  for (const [path, bytes] of project.workspace.entries()) {
    if (excluded.has(path)) continue;
    files[`EPUB/${path}`] = bytes;
    resourceItems.push(
      `<item id="${safeId(path, resourceIndex++)}" href="${xmlEscape(path)}" media-type="${mediaType(path)}"/>`,
    );
  }

  const identifier = `urn:pubforge:${project.snapshot.repository}:${project.snapshot.commitSha}`;
  const authors = project.manifest.author
    ? (Array.isArray(project.manifest.author)
        ? project.manifest.author
        : [project.manifest.author]
      )
        .map((author) => `<dc:creator>${xmlEscape(author)}</dc:creator>`)
        .join('\n')
    : '';

  files['EPUB/nav.xhtml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xmlEscape(project.manifest.language)}">
<head><title>Contents</title></head>
<body>
<nav epub:type="toc" id="toc">
<h1>Contents</h1>
<ol>${navItems.join('')}</ol>
</nav>
</body>
</html>`);

  files['EPUB/package.opf'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="pub-id">${xmlEscape(identifier)}</dc:identifier>
<dc:title>${xmlEscape(project.manifest.title)}</dc:title>
<dc:language>${xmlEscape(project.manifest.language)}</dc:language>
${authors}
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${chapterItems.join('\n')}
${resourceItems.join('\n')}
</manifest>
<spine>
${spineItems.join('\n')}
</spine>
</package>`);

  const archive = zipSync(files, { level: 6 });
  downloadBytes(
    archive,
    `${slugify(project.manifest.title)}.epub`,
    'application/epub+zip',
  );
}
