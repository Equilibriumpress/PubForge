import { useEffect, useMemo } from 'react';
import { Renderer } from '@vivliostyle/react';

import type { PdfEdition } from '../engine/output-profile';
import type { LoadedProject } from '../lib/load-project';
import { buildPublicationDocument } from '../render/build-html';

interface PublicationPrintViewProps {
  project: LoadedProject;
  edition?: PdfEdition;
}

export function PublicationPrintView({
  project,
  edition = 'normal',
}: PublicationPrintViewProps) {
  const publication = useMemo(
    () => buildPublicationDocument(project, { edition }),
    [project.snapshot.commitSha, edition],
  );

  useEffect(() => {
    const close = () => window.close();
    window.addEventListener('afterprint', close);
    return () => {
      window.removeEventListener('afterprint', close);
      publication.dispose();
    };
  }, [publication]);

  return (
    <main className="printPublicationView" data-edition={edition}>
      <Renderer
        source={publication.url}
        renderAllPages
        autoResize={false}
        fitToScreen={false}
        background="#ffffff"
        onLoad={() => {
          document.title = `${project.manifest.publication.title} · ${edition}`;
          window.setTimeout(() => window.print(), 250);
        }}
      />
    </main>
  );
}
