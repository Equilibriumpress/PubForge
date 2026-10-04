import { useMemo } from 'react';

import type { LoadedProject } from '../lib/load-project';
import { buildPublicationDocument } from '../render/build-html';
import { exportEpub } from '../export/epub';
import { exportProjectZip } from '../export/project-zip';
import { exportWebPublication } from '../export/webpub';

interface ExportPanelProps {
  project: LoadedProject;
}

export function ExportPanel({ project }: ExportPanelProps) {
  const enabled = useMemo(() => new Set(project.manifest.outputs), [project]);

  function printPublication() {
    const publication = buildPublicationDocument(project);
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.append(frame);

    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => {
        frame.remove();
        publication.dispose();
      }, 1000);
    };
    frame.srcdoc = publication.html;
  }

  return (
    <section className="exportPanel">
      <div>
        <p className="eyebrow">Export</p>
        <h2>One snapshot, several formats</h2>
        <p>
          Every export below comes from commit {project.snapshot.commitSha.slice(0, 7)}.
        </p>
      </div>
      <div className="exportActions">
        {enabled.has('print') ? (
          <button type="button" onClick={printPublication}>Print / Save PDF</button>
        ) : null}
        {enabled.has('epub') ? (
          <button type="button" onClick={() => exportEpub(project)}>Export EPUB</button>
        ) : null}
        {enabled.has('webpub') ? (
          <button type="button" onClick={() => exportWebPublication(project)}>
            Export WebPub
          </button>
        ) : null}
        {enabled.has('project-zip') ? (
          <button type="button" onClick={() => exportProjectZip(project)}>
            Project ZIP
          </button>
        ) : null}
      </div>
    </section>
  );
}
