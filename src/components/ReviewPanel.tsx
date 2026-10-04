import { useEffect, useMemo, useState } from 'react';
import { PageViewMode } from '@vivliostyle/core';
import { Renderer } from '@vivliostyle/react';

import type { LoadedProject } from '../lib/load-project';
import { buildPublicationDocument } from '../render/build-html';

interface ReviewPanelProps {
  project: LoadedProject;
}

type ViewMode = 'single' | 'spread';

const ZOOM_LEVELS = [0.65, 0.8, 1, 1.15, 1.3];

export function ReviewPanel({ project }: ReviewPanelProps) {
  const publication = useMemo(
    () => buildPublicationDocument(project),
    [project.snapshot.commitSha, project.manifestPath],
  );
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [viewMode, setViewMode] = useState<ViewMode>('spread');

  useEffect(() => {
    setPage(1);
    setPageCount(null);
    return () => publication.dispose();
  }, [publication]);

  const pageNumbers = pageCount
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : [];

  return (
    <section className="reviewSurface">
      <header className="reviewHeader">
        <div>
          <p className="eyebrow">Publication review</p>
          <h2>Inspect the designed pages</h2>
          <p>
            Read-only Vivliostyle review of commit{' '}
            {project.snapshot.commitSha.slice(0, 7)}. Layout controls below are
            viewing controls only and never change Git source.
          </p>
        </div>
        <div className="reviewState">
          <span>{viewMode === 'spread' ? 'Spread' : 'Single page'}</span>
          <span>{Math.round(zoom * 100) + '%'}</span>
          <span>{pageCount ? pageCount + ' pages' : 'Paginating…'}</span>
        </div>
      </header>

      <div className="reviewControls">
        <div className="reviewControlGroup" aria-label="View mode">
          <span>View</span>
          <button
            type="button"
            className={viewMode === 'single' ? 'reviewChoice active' : 'reviewChoice'}
            onClick={() => setViewMode('single')}
          >
            Single
          </button>
          <button
            type="button"
            className={viewMode === 'spread' ? 'reviewChoice active' : 'reviewChoice'}
            onClick={() => setViewMode('spread')}
          >
            Spread
          </button>
        </div>

        <div className="reviewControlGroup" aria-label="Zoom">
          <span>Zoom</span>
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={zoom === level ? 'reviewChoice active' : 'reviewChoice'}
              onClick={() => setZoom(level)}
            >
              {Math.round(level * 100) + '%'}
            </button>
          ))}
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
            Page {page}{pageCount ? ' / ' + pageCount : ''}
          </span>
          <button
            type="button"
            className="secondaryButton"
            onClick={() =>
              setPage((value) =>
                pageCount ? Math.min(pageCount, value + 1) : value + 1,
              )
            }
            disabled={pageCount !== null && page >= pageCount}
          >
            Next
          </button>
        </div>
      </div>

      {pageNumbers.length ? (
        <nav className="reviewPageRail" aria-label="Page navigator">
          {pageNumbers.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              className={
                pageNumber === page
                  ? 'reviewPageChip reviewPageChipActive'
                  : 'reviewPageChip'
              }
              aria-label={'Go to page ' + pageNumber}
              aria-current={pageNumber === page ? 'page' : undefined}
              onClick={() => setPage(pageNumber)}
            >
              <span>{pageNumber}</span>
            </button>
          ))}
        </nav>
      ) : null}

      <div className="reviewCanvas">
        <Renderer
          source={publication.url}
          page={page}
          zoom={zoom}
          bookMode={false}
          pageViewMode={
            viewMode === 'spread'
              ? PageViewMode.SPREAD
              : PageViewMode.SINGLE_PAGE
          }
          renderAllPages
          onLoad={(state) => {
            setPageCount(state.epageCount);
            setPage(Math.min(page, Math.max(1, state.epageCount)));
          }}
          onNavigation={(state) => {
            if (state.epage > 0) setPage(Math.max(1, state.epage));
          }}
        />
      </div>
    </section>
  );
}
