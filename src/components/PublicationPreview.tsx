import { useEffect, useMemo, useState } from 'react';
import { Renderer } from '@vivliostyle/react';

import type { LoadedProject } from '../lib/load-project';
import { buildPublicationDocument } from '../render/build-html';

interface PublicationPreviewProps {
  project: LoadedProject;
  revision?: number;
}

export function PublicationPreview({
  project,
  revision = 0,
}: PublicationPreviewProps) {
  const publication = useMemo(
    () => buildPublicationDocument(project),
    [project.snapshot.commitSha, revision],
  );
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
    setPageCount(null);
    return () => publication.dispose();
  }, [publication]);

  return (
    <section className="previewPanel">
      <header className="previewToolbar">
        <div>
          <p className="eyebrow">Vivliostyle preview</p>
          <strong>{project.manifest.title}</strong>
        </div>
        <div className="pageControls">
          <button
            type="button"
            className="secondaryButton"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>
            Page {page}{pageCount ? ` / ${pageCount}` : ''}
          </span>
          <button
            type="button"
            className="secondaryButton"
            onClick={() =>
              setPage((value) => (pageCount ? Math.min(pageCount, value + 1) : value + 1))
            }
            disabled={pageCount !== null && page >= pageCount}
          >
            Next
          </button>
        </div>
      </header>

      <div className="previewCanvas">
        <Renderer
          source={publication.url}
          page={page}
          onLoad={(state) => setPageCount(state.epageCount)}
        />
      </div>
    </section>
  );
}
