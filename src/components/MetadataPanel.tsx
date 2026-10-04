import type { LoadedProject } from '../lib/load-project';

export function MetadataPanel({ project }: { project: LoadedProject }) {
  const author = Array.isArray(project.manifest.author)
    ? project.manifest.author.join(', ')
    : project.manifest.author ?? '—';

  return (
    <section className="studioCard">
      <header className="studioPanelHeader">
        <div>
          <p className="eyebrow">Metadata</p>
          <strong>publication.yml</strong>
        </div>
      </header>
      <dl className="metadataGrid">
        <div><dt>Title</dt><dd>{project.manifest.title}</dd></div>
        <div><dt>Subtitle</dt><dd>{project.manifest.subtitle ?? '—'}</dd></div>
        <div><dt>Author</dt><dd>{author}</dd></div>
        <div><dt>Language</dt><dd>{project.manifest.language}</dd></div>
        <div><dt>Type</dt><dd>{project.manifest.type ?? 'custom'}</dd></div>
        <div><dt>Theme</dt><dd>{project.manifest.theme.css}</dd></div>
        <div><dt>Content files</dt><dd>{project.manifest.content.length}</dd></div>
        <div><dt>Outputs</dt><dd>{project.manifest.outputs.join(', ')}</dd></div>
      </dl>
      <p className="panelFootnote">
        Metadata remains file-based. Edit publication.yml in Source to change it.
      </p>
    </section>
  );
}
