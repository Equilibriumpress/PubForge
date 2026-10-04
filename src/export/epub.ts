import { strToU8, zipSync, type Zippable } from 'fflate';

import {
  compilePublication,
  publicationIdentifier,
  rewriteHtmlReferences,
  roleToEpubType,
} from '../engine/compile';
import type { LoadedProject } from '../lib/load-project';
import { downloadBytes, mediaType, slugify, xmlEscape } from './utils';

function xhtmlBody(fragment: string): string {
  const document = window.document.implementation.createHTMLDocument('');
  document.body.innerHTML = fragment;
  const serializer = new XMLSerializer();
  return [...document.body.childNodes]
    .map((node) => serializer.serializeToString(node))
    .join('');
}

function safeId(path: string, index: number): string {
  return `res-${index}-${path
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function chapterXhtml(
  project: LoadedProject,
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
  chapterMap: Map<string, string>,
): string {
  const html = rewriteHtmlReferences(
    chapter.html,
    chapter.sourcePath,
    (resolved) => {
      const chapterTarget = chapterMap.get(resolved);
      if (chapterTarget) return chapterTarget.replace(/^text\//, '');
      if (project.workspace.has(resolved)) return `../${resolved}`;
      return null;
    },
  );

  const themePaths = [
    ...chapter.themePaths,
    ...(project.manifest.epub?.theme ? [project.manifest.epub.theme] : []),
  ].filter((path, index, values) => values.indexOf(path) === index);

  const styles = themePaths
    .map(
      (path) =>
        `<link rel="stylesheet" type="text/css" href="../${xmlEscape(path)}"/>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xmlEscape(project.manifest.publication.language)}" xml:lang="${xmlEscape(project.manifest.publication.language)}">
<head>
<title>${xmlEscape(chapter.title)}</title>
${styles}
</head>
<body epub:type="${roleToEpubType(chapter.role)}">
<section epub:type="${roleToEpubType(chapter.role)}">
${xhtmlBody(html)}
</section>
</body>
</html>`;
}

function coverXhtml(project: LoadedProject, imagePath: string): string {
  const alt = project.manifest.cover?.alt ?? project.manifest.publication.title;
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xmlEscape(project.manifest.publication.language)}">
<head><title>Cover</title></head>
<body epub:type="cover">
<section epub:type="cover">
<img src="../${xmlEscape(imagePath)}" alt="${xmlEscape(alt)}"/>
</section>
</body>
</html>`;
}

export function exportEpub(project: LoadedProject): void {
  const compiled = compilePublication(project);
  const files: Zippable = {
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
  };

  files['META-INF/container.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const chapterMap = new Map(
    compiled.chapters.map((chapter) => [chapter.sourcePath, chapter.outputPath]),
  );
  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const tocItems: string[] = [];

  const coverImage =
    project.manifest.cover?.image &&
    project.workspace.has(project.manifest.cover.image)
      ? project.manifest.cover.image
      : null;

  if (coverImage) {
    files['EPUB/text/cover.xhtml'] = strToU8(coverXhtml(project, coverImage));
    manifestItems.push(
      '<item id="cover-page" href="text/cover.xhtml" media-type="application/xhtml+xml"/>',
    );
    spineItems.push('<itemref idref="cover-page" linear="yes"/>');
  }

  for (const chapter of compiled.chapters) {
    const id = `chapter-${chapter.index + 1}`;
    const xhtml = chapterXhtml(project, chapter, chapterMap);
    files[`EPUB/${chapter.outputPath}`] = strToU8(xhtml);

    const properties = xhtml.includes('<math') ? ' properties="mathml"' : '';
    manifestItems.push(
      `<item id="${id}" href="${chapter.outputPath}" media-type="application/xhtml+xml"${properties}/>`,
    );
    spineItems.push(`<itemref idref="${id}"/>`);
    tocItems.push(
      `<li><a href="${chapter.outputPath}">${xmlEscape(chapter.title)}</a></li>`,
    );
  }

  const excluded = new Set([
    'publication.yml',
    ...compiled.chapters.map((chapter) => chapter.sourcePath),
  ]);
  let resourceIndex = 0;

  for (const [path, bytes] of project.workspace.entries()) {
    if (excluded.has(path)) continue;
    files[`EPUB/${path}`] = bytes;

    const properties =
      coverImage === path
        ? ' properties="cover-image"'
        : '';
    manifestItems.push(
      `<item id="${safeId(path, resourceIndex++)}" href="${xmlEscape(path)}" media-type="${mediaType(path)}"${properties}/>`,
    );
  }

  const landmarks: string[] = [];
  if (coverImage) {
    landmarks.push(
      '<li><a epub:type="cover" href="text/cover.xhtml">Cover</a></li>',
    );
  }
  const firstBody = compiled.chapters.find((chapter) => chapter.role === 'chapter');
  if (firstBody) {
    landmarks.push(
      `<li><a epub:type="bodymatter" href="${firstBody.outputPath}">Start of content</a></li>`,
    );
  }

  const tocNav =
    project.manifest.contents?.toc === false
      ? ''
      : `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${tocItems.join('')}</ol></nav>`;
  const landmarksNav =
    project.manifest.contents?.landmarks === false || landmarks.length === 0
      ? ''
      : `<nav epub:type="landmarks" hidden="hidden"><h2>Landmarks</h2><ol>${landmarks.join('')}</ol></nav>`;

  files['EPUB/nav.xhtml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xmlEscape(project.manifest.publication.language)}">
<head><title>Navigation</title></head>
<body>
${tocNav}
${landmarksNav}
</body>
</html>`);
  manifestItems.unshift(
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
  );

  const metadata = project.manifest.publication;
  const creators = (metadata.authors ?? [])
    .map((author) => `<dc:creator>${xmlEscape(author)}</dc:creator>`)
    .join('\n');
  const subjects = (metadata.subjects ?? [])
    .map((subject) => `<dc:subject>${xmlEscape(subject)}</dc:subject>`)
    .join('\n');

  files['EPUB/package.opf'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" prefix="dcterms: http://purl.org/dc/terms/">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="pub-id">${xmlEscape(publicationIdentifier(project))}</dc:identifier>
<dc:title>${xmlEscape(metadata.title)}</dc:title>
${metadata.subtitle ? `<meta property="title-type" refines="#subtitle">subtitle</meta><dc:title id="subtitle">${xmlEscape(metadata.subtitle)}</dc:title>` : ''}
<dc:language>${xmlEscape(metadata.language)}</dc:language>
${creators}
${metadata.publisher ? `<dc:publisher>${xmlEscape(metadata.publisher)}</dc:publisher>` : ''}
${metadata.description ? `<dc:description>${xmlEscape(metadata.description)}</dc:description>` : ''}
${subjects}
${metadata.rights ? `<dc:rights>${xmlEscape(metadata.rights)}</dc:rights>` : ''}
${metadata.date ? `<dc:date>${xmlEscape(metadata.date)}</dc:date>` : ''}
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
</metadata>
<manifest>
${manifestItems.join('\n')}
</manifest>
<spine page-progression-direction="${project.manifest.pdf?.binding === 'right' ? 'rtl' : 'ltr'}">
${spineItems.join('\n')}
</spine>
</package>`);

  const archive = zipSync(files, { level: 6 });
  downloadBytes(
    archive,
    `${slugify(metadata.title)}.epub`,
    'application/epub+zip',
  );
}
