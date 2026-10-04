import {
  compilePublication,
  findChapterByResolvedPath,
  publicationIdentifier,
  rewriteHtmlReferences,
} from '../engine/compile';
import type { LoadedProject } from '../lib/load-project';
import { downloadBytes, mediaType, slugify, zipFiles } from './utils';

function webpubChapterPath(
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
): string {
  return `chapters/${chapter.outputPath
    .replace(/^text\//, '')
    .replace(/\.xhtml$/i, '.html')}`;
}

function webpubTargetHref(
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
): string {
  return webpubChapterPath(chapter).replace(/^chapters\//, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chapterHtml(
  project: LoadedProject,
  chapter: ReturnType<typeof compilePublication>['chapters'][number],
  compiled: ReturnType<typeof compilePublication>,
): string {
  const body = rewriteHtmlReferences(
    chapter.html,
    chapter.sourcePath,
    (resolved) => {
      const target = findChapterByResolvedPath(compiled, resolved);
      if (target) return webpubTargetHref(target);
      if (project.workspace.has(resolved)) return `../${resolved}`;
      return null;
    },
  );

  const styles = chapter.themePaths
    .map((path) => `<link rel="stylesheet" href="../${escapeHtml(path)}">`)
    .join('\n');

  return `<!doctype html>
<html lang="${escapeHtml(project.manifest.publication.language)}" dir="${project.manifest.publication.readingProgression ?? 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(chapter.title)}</title>
${styles}
</head>
<body data-role="${chapter.role}">
<main>
${body}
</main>
</body>
</html>`;
}

export function exportWebPublication(project: LoadedProject): void {
  const compiled = compilePublication(project);

  const extras: Record<string, string | Uint8Array> = {};
  const readingOrder = compiled.chapters.map((chapter) => {
    const outputPath = webpubChapterPath(chapter);
    extras[outputPath] = chapterHtml(project, chapter, compiled);
    return {
      url: outputPath,
      name: chapter.title,
      encodingFormat: 'text/html',
      type: chapter.role === 'chapter' ? 'Chapter' : 'CreativeWork',
    };
  });

  const resourceEntries = compiled.assetPaths.map(
    (path) => [path, project.workspace.read(path)] as [string, Uint8Array],
  );

  const resources = resourceEntries.map(([path]) => ({
    url: path,
    encodingFormat: mediaType(path),
    ...(project.manifest.cover?.image === path ? { rel: 'cover' } : {}),
  }));

  const metadata = project.manifest.publication;
  const manifest = {
    '@context': ['https://schema.org', 'https://www.w3.org/ns/pub-context'],
    conformsTo: 'https://www.w3.org/TR/pub-manifest/',
    type: 'CreativeWork',
    id: publicationIdentifier(project),
    name: metadata.title,
    alternateName: metadata.subtitle,
    inLanguage: metadata.language,
    author: (metadata.authors ?? []).map((name) => ({ type: 'Person', name })),
    publisher: metadata.publisher
      ? { type: 'Organization', name: metadata.publisher }
      : undefined,
    description: metadata.description,
    keywords: metadata.subjects,
    copyrightNotice: metadata.rights,
    datePublished: metadata.date,
    readingProgression: metadata.readingProgression ?? 'ltr',
    readingOrder,
    resources,
  };

  extras['publication.json'] = JSON.stringify(manifest, null, 2);
  extras['index.html'] = `<!doctype html>
<html lang="${escapeHtml(metadata.language)}" dir="${metadata.readingProgression ?? 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(metadata.title)}</title>
<link rel="publication" href="publication.json">
<meta http-equiv="refresh" content="0; url=${readingOrder[0]?.url ?? ''}">
</head>
<body><p><a href="${readingOrder[0]?.url ?? ''}">Open publication</a></p></body>
</html>`;

  const archive = zipFiles(resourceEntries, extras);
  downloadBytes(
    archive,
    `${slugify(metadata.title)}.webpub.zip`,
    'application/zip',
  );
}
