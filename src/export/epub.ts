import { strToU8, zipSync, type Zippable } from 'fflate';

import {
  compilePublication,
  findChapterByResolvedPath,
  publicationIdentifier,
  rewriteHtmlReferences,
  roleToEpubType,
} from '../engine/compile';
import type { LoadedProject } from '../lib/load-project';
import { downloadBytes, mediaType, slugify, xmlEscape } from './utils';

export type EpubLayoutMode = 'reflowable' | 'fixed';

interface FixedViewport {
  width: number;
  height: number;
}

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

function lengthToCssPx(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return undefined;
  if (value.endsWith('mm')) return Math.round((numeric / 25.4) * 96);
  if (value.endsWith('cm')) return Math.round((numeric / 2.54) * 96);
  if (value.endsWith('in')) return Math.round(numeric * 96);
  if (value.endsWith('px')) return Math.round(numeric);
  return undefined;
}

function fixedViewport(project: LoadedProject): FixedViewport {
  if (project.manifest.epub?.viewport) return project.manifest.epub.viewport;

  const standards: Record<string, FixedViewport> = {
    A4: { width: 794, height: 1123 },
    A5: { width: 559, height: 794 },
    A6: { width: 397, height: 559 },
    Letter: { width: 816, height: 1056 },
    Legal: { width: 816, height: 1344 },
  };

  const width = lengthToCssPx(project.manifest.pdf?.width);
  const height = lengthToCssPx(project.manifest.pdf?.height);
  if (width && height) return { width, height };

  return standards[project.manifest.pdf?.size ?? 'A4'] ?? standards.A4;
}

function chapterStyles(
  project: LoadedProject,
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
  layout: EpubLayoutMode,
): string {
  const layoutTheme =
    layout === 'fixed'
      ? project.manifest.epub?.fixedTheme
      : project.manifest.epub?.theme;
  const themePaths = [
    ...chapter.themePaths,
    ...project.resolvedThemes.epub,
    ...(layoutTheme ? [layoutTheme] : []),
  ].filter((path, index, values) => values.indexOf(path) === index);

  return themePaths
    .map(
      (path) =>
        `<link rel="stylesheet" type="text/css" href="../${xmlEscape(path)}"/>`,
    )
    .join('\n');
}

function chapterHtml(
  project: LoadedProject,
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
  compiled: ReturnType<typeof compilePublication>,
): string {
  return rewriteHtmlReferences(
    chapter.html,
    chapter.sourcePath,
    (resolved) => {
      const target = findChapterByResolvedPath(compiled, resolved);
      if (target) return target.outputPath.replace(/^text\//, '');
      if (project.workspace.has(resolved)) return `../${resolved}`;
      return null;
    },
  );
}

function reflowableChapterXhtml(
  project: LoadedProject,
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
  compiled: ReturnType<typeof compilePublication>,
): string {
  const html = chapterHtml(project, chapter, compiled);
  const styles = chapterStyles(project, chapter, 'reflowable');

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xmlEscape(project.manifest.publication.language)}" xml:lang="${xmlEscape(project.manifest.publication.language)}" dir="${project.manifest.publication.readingProgression ?? 'ltr'}">
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

function fixedChapterXhtml(
  project: LoadedProject,
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
  compiled: ReturnType<typeof compilePublication>,
  viewport: FixedViewport,
): string {
  const html = chapterHtml(project, chapter, compiled);
  const styles = chapterStyles(project, chapter, 'fixed');
  const layoutClass = chapter.layout
    ? ` pubforge-entry-layout-${chapter.layout}`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xmlEscape(project.manifest.publication.language)}" xml:lang="${xmlEscape(project.manifest.publication.language)}" dir="${project.manifest.publication.readingProgression ?? 'ltr'}">
<head>
<title>${xmlEscape(chapter.title)}</title>
<meta name="viewport" content="width=${viewport.width}, height=${viewport.height}"/>
${styles}
<style>
html, body {
  width: ${viewport.width}px;
  height: ${viewport.height}px;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
body { position: relative; }
.pubforge-fixed-page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
}
</style>
</head>
<body epub:type="${roleToEpubType(chapter.role)}">
<section class="pubforge-chapter pubforge-fixed-page${layoutClass}" data-entry-layout="${chapter.layout ?? 'page'}" epub:type="${roleToEpubType(chapter.role)}">
${xhtmlBody(html)}
</section>
</body>
</html>`;
}

function coverXhtml(project: LoadedProject, imagePath: string): string {
  const alt = project.manifest.cover?.alt ?? project.manifest.publication.title;
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xmlEscape(project.manifest.publication.language)}" dir="${project.manifest.publication.readingProgression ?? 'ltr'}">
<head><title>Cover</title></head>
<body epub:type="cover">
<section epub:type="cover">
<img src="../${xmlEscape(imagePath)}" alt="${xmlEscape(alt)}"/>
</section>
</body>
</html>`;
}

function chapterTocItem(
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
  depth: number,
): string {
  if (depth <= 1) {
    return `<li><a href="${chapter.outputPath}">${xmlEscape(chapter.title)}</a></li>`;
  }

  const document = new DOMParser().parseFromString(chapter.html, 'text/html');
  const selectors = Array.from(
    { length: Math.max(0, depth - 1) },
    (_, index) => `h${index + 2}[id]`,
  ).join(', ');
  const children = selectors
    ? Array.from(document.querySelectorAll<HTMLElement>(selectors))
        .map((heading) => {
          const label = heading.textContent?.trim();
          return label
            ? `<li><a href="${chapter.outputPath}#${xmlEscape(heading.id)}">${xmlEscape(label)}</a></li>`
            : '';
        })
        .filter(Boolean)
        .join('')
    : '';

  return `<li><a href="${chapter.outputPath}">${xmlEscape(chapter.title)}</a>${children ? `<ol>${children}</ol>` : ''}</li>`;
}

function collectPageList(
  compiled: ReturnType<typeof compilePublication>,
): string[] {
  const items: string[] = [];
  for (const chapter of compiled.chapters) {
    const document = new DOMParser().parseFromString(chapter.html, 'text/html');
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('[id]'))) {
      const role = element.getAttribute('role');
      const epubType = element.getAttribute('epub:type') ?? '';
      const isPageBreak =
        role === 'doc-pagebreak' ||
        epubType.split(/\s+/).includes('pagebreak');
      if (!isPageBreak) continue;

      const label =
        element.getAttribute('aria-label') ??
        element.getAttribute('title') ??
        element.textContent?.trim() ??
        element.id;
      items.push(
        `<li><a href="${chapter.outputPath}#${xmlEscape(element.id)}">${xmlEscape(label || element.id)}</a></li>`,
      );
    }
  }
  return items;
}

export function buildEpubArchive(
  project: LoadedProject,
  options: { layout?: EpubLayoutMode } = {},
): Uint8Array {
  const compiled = compilePublication(project);
  const layout =
    options.layout ??
    project.manifest.epub?.layout ??
    (project.manifest.epub?.reflowable === false ? 'fixed' : 'reflowable');
  const fixed = layout === 'fixed';
  const viewport = fixed ? fixedViewport(project) : null;
  const vendorProfile = project.manifest.epub?.vendorProfile ?? 'generic';

  const files: Zippable = {
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
  };

  files['META-INF/container.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const tocItems: string[] = [];

  const coverImage =
    project.manifest.cover?.image &&
    project.workspace.has(project.manifest.cover.image)
      ? project.manifest.cover.image
      : null;

  if (coverImage && !fixed) {
    files['EPUB/text/cover.xhtml'] = strToU8(coverXhtml(project, coverImage));
    manifestItems.push(
      '<item id="cover-page" href="text/cover.xhtml" media-type="application/xhtml+xml"/>',
    );
    spineItems.push('<itemref idref="cover-page" linear="yes"/>');
  }

  for (const chapter of compiled.chapters) {
    const id = `chapter-${chapter.index + 1}`;
    const xhtml =
      fixed && viewport
        ? fixedChapterXhtml(project, chapter, compiled, viewport)
        : reflowableChapterXhtml(project, chapter, compiled);
    files[`EPUB/${chapter.outputPath}`] = strToU8(xhtml);

    const properties = xhtml.includes('<math') ? ' properties="mathml"' : '';
    manifestItems.push(
      `<item id="${id}" href="${chapter.outputPath}" media-type="application/xhtml+xml"${properties}/>`,
    );
    spineItems.push(`<itemref idref="${id}"/>`);
    tocItems.push(
      chapterTocItem(chapter, project.manifest.contents?.sectionDepth ?? 1),
    );
  }

  let resourceIndex = 0;
  for (const path of compiled.assetPaths) {
    const bytes = project.workspace.read(path);
    files[`EPUB/${path}`] = bytes;
    const properties = coverImage === path ? ' properties="cover-image"' : '';
    manifestItems.push(
      `<item id="${safeId(path, resourceIndex++)}" href="${xmlEscape(path)}" media-type="${mediaType(path)}"${properties}/>`,
    );
  }

  const landmarks: string[] = [];
  if (coverImage) {
    const coverHref = fixed
      ? compiled.chapters[0]?.outputPath
      : 'text/cover.xhtml';
    if (coverHref) {
      landmarks.push(
        `<li><a epub:type="cover" href="${coverHref}">Cover</a></li>`,
      );
    }
  }
  const firstBody = compiled.chapters.find((chapter) => chapter.role === 'chapter');
  if (firstBody) {
    landmarks.push(
      `<li><a epub:type="bodymatter" href="${firstBody.outputPath}">Start of content</a></li>`,
    );
  }

  const tocTitle = project.manifest.contents?.tocTitle ?? 'Contents';
  const tocNav =
    project.manifest.contents?.toc === false
      ? ''
      : `<nav epub:type="toc" id="toc"><h1>${xmlEscape(tocTitle)}</h1><ol>${tocItems.join('')}</ol></nav>`;
  const pageListItems = collectPageList(compiled);
  const pageListNav =
    project.manifest.contents?.pageList && pageListItems.length
      ? `<nav epub:type="page-list" id="page-list"><h2>Pages</h2><ol>${pageListItems.join('')}</ol></nav>`
      : '';
  const landmarksNav =
    project.manifest.contents?.landmarks === false || landmarks.length === 0
      ? ''
      : `<nav epub:type="landmarks" hidden="hidden"><h2>Landmarks</h2><ol>${landmarks.join('')}</ol></nav>`;

  files['EPUB/nav.xhtml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xmlEscape(project.manifest.publication.language)}" dir="${project.manifest.publication.readingProgression ?? 'ltr'}">
<head><title>Navigation</title></head>
<body>
${tocNav}
${pageListNav}
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

  const fixedMetadata = fixed
    ? `<meta property="rendition:layout">pre-paginated</meta>
<meta property="rendition:orientation">${project.manifest.epub?.orientation ?? 'auto'}</meta>
<meta property="rendition:spread">${project.manifest.epub?.spread ?? 'auto'}</meta>`
    : '<meta property="rendition:layout">reflowable</meta>';

  const appleMetadata =
    vendorProfile === 'apple-books' && project.manifest.epub?.embeddedFonts
      ? '<meta property="ibooks:specified-fonts">true</meta>'
      : '';

  const kindleMetadata =
    vendorProfile === 'kindle' && fixed && viewport
      ? `<meta name="fixed-layout" content="true"/>
<meta name="original-resolution" content="${viewport.width}x${viewport.height}"/>
<meta name="orientation-lock" content="${project.manifest.epub?.orientation === 'portrait' || project.manifest.epub?.orientation === 'landscape' ? project.manifest.epub.orientation : 'none'}"/>
<meta name="primary-writing-mode" content="${project.manifest.publication.readingProgression === 'rtl' ? 'horizontal-rl' : 'horizontal-lr'}"/>`
      : '';

  const packagePrefixes = [
    'dcterms: http://purl.org/dc/terms/',
    'rendition: http://www.idpf.org/vocab/rendition/#',
    ...(vendorProfile === 'apple-books'
      ? ['ibooks: http://vocabulary.itunes.apple.com/rdf/ibooks/vocabulary-extensions-1.0/']
      : []),
  ].join(' ');

  files['EPUB/package.opf'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" prefix="${packagePrefixes}">
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
${fixedMetadata}
${appleMetadata}
${kindleMetadata}
</metadata>
<manifest>
${manifestItems.join('\n')}
</manifest>
<spine page-progression-direction="${project.manifest.publication.readingProgression ?? 'ltr'}">
${spineItems.join('\n')}
</spine>
</package>`);

  return zipSync(files, { level: 6 });
}

export function exportEpub(
  project: LoadedProject,
  layout?: EpubLayoutMode,
): void {
  const resolvedLayout =
    layout ??
    project.manifest.epub?.layout ??
    (project.manifest.epub?.reflowable === false ? 'fixed' : 'reflowable');
  const archive = buildEpubArchive(project, { layout: resolvedLayout });
  const editions = project.manifest.epub?.editions ?? [resolvedLayout];
  const suffix =
    editions.length > 1
      ? `-${resolvedLayout}`
      : resolvedLayout === 'fixed'
        ? '-fixed'
        : '';
  downloadBytes(
    archive,
    `${slugify(project.manifest.publication.title)}${suffix}.epub`,
    'application/epub+zip',
  );
}
