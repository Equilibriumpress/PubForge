import { useEffect, useMemo } from 'react';
import { Renderer } from '@vivliostyle/react';

import type { LoadedProject } from '../lib/load-project';
import { buildPublicationDocument } from '../render/build-html';

export function PublicationPrintView({ project }: { project: LoadedProject }) {
  const publication = useMemo(
    () => buildPublicationDocument(project),
    [project.snapshot.commitSha],
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
    <main className="printPublicationView">
      <Renderer
        source={publication.url}
        renderAllPages
        autoResize={false}
        fitToScreen={false}
        background="#ffffff"
        onLoad={() => {
          document.title = project.manifest.publication.title;
          window.setTimeout(() => window.print(), 250);
        }}
      />
    </main>
  );
}
