import type { LoadedProject } from '../lib/load-project';
import { exportEpub } from '../export/epub';
import { exportProjectZip } from '../export/project-zip';
import { exportWebPublication } from '../export/webpub';

interface ExportPanelProps {
  project: LoadedProject;
}

export function ExportPanel({ project }: ExportPanelProps) {
  function printPublication() {
    const url = new URL(window.location.href);
    url.searchParams.set(
      'repo',
      `${project.snapshot.repository}@${project.snapshot.commitSha}`,
    );
    url.searchParams.set('print', '1');
    window.open(url, '_blank', 'noopener');
  }

  const outputs = [
    {
      id: 'pdf',
      enabled: project.manifest.pdf?.enabled !== false,
      title: 'PDF',
      detail: 'Vivliostyle paginated print view using the PDF profile.',
      action: printPublication,
      label: 'Open PDF print view',
    },
    {
      id: 'epub',
      enabled: project.manifest.epub?.enabled !== false,
      title: 'EPUB 3',
      detail: 'Reflowable EPUB with navigation, metadata and semantic reading order.',
      action: () => exportEpub(project),
      label: 'Export EPUB',
    },
    {
      id: 'webpub',
      enabled: project.manifest.webpub?.enabled !== false,
      title: 'Web Publication',
      detail: 'Portable web publication with a W3C publication manifest.',
      action: () => exportWebPublication(project),
      label: 'Export WebPub',
    },
    {
      id: 'project',
      enabled: project.manifest.projectZip?.enabled !== false,
      title: 'Source snapshot',
      detail: 'Exact committed project snapshot for archival and reproduction.',
      action: () => exportProjectZip(project),
      label: 'Project ZIP',
    },
  ].filter((output) => output.enabled);

  return (
    <section className="exportPanel">
      <div>
        <p className="eyebrow">Output</p>
        <h2>One publication engine</h2>
        <p>
          Preview and outputs are compiled from commit{' '}
          {project.snapshot.commitSha.slice(0, 7)} using the same reading order,
          VFM settings, metadata and project assets.
        </p>
      </div>
      <div className="outputCards">
        {outputs.map((output) => (
          <article className="outputCard" key={output.id}>
            <div>
              <strong>{output.title}</strong>
              <p>{output.detail}</p>
            </div>
            <button type="button" onClick={output.action}>
              {output.label}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
