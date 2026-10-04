import type { LoadedProject } from '../lib/load-project';
import { buildPortableHtml } from './portable-html';
import { downloadBytes, mediaType, slugify, zipFiles } from './utils';

export function exportWebPublication(project: LoadedProject): void {
  const html = buildPortableHtml(project);
  const resources = project.workspace
    .list()
    .filter((path) => path !== 'publication.yml')
    .map((path) => ({
      url: path,
      encodingFormat: mediaType(path),
    }));

  const manifest = {
    '@context': ['https://schema.org', 'https://www.w3.org/ns/pub-context'],
    conformsTo: 'https://www.w3.org/TR/pub-manifest/',
    type: 'CreativeWork',
    name: project.manifest.title,
    inLanguage: project.manifest.language,
    author: project.manifest.author
      ? (Array.isArray(project.manifest.author)
          ? project.manifest.author
          : [project.manifest.author]
        ).map((name) => ({ type: 'Person', name }))
      : undefined,
    readingOrder: [{ url: 'index.html', encodingFormat: 'text/html' }],
    resources,
  };

  const archive = zipFiles(project.workspace.entries(), {
    'index.html': html,
    'publication.json': JSON.stringify(manifest, null, 2),
  });

  downloadBytes(
    archive,
    `${slugify(project.manifest.title)}.webpub.zip`,
    'application/zip',
  );
}
