import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PageViewMode } from '@vivliostyle/core';
import { Renderer } from '@vivliostyle/react';

import { LayoutLabPanel } from './LayoutLabPanel';
import type { LoadedProject } from '../lib/load-project';
import { buildPublicationDocument } from '../render/build-html';
import {
  runLayoutAudit,
  type LayoutAuditReport,
} from '../review/layout-audit';
import {
  buildLayoutLabCss,
  DEFAULT_LAYOUT_LAB,
  type LayoutLabSettings,
} from '../review/layout-lab';
import {
  buildImprovementBrief,
  copyReviewText,
} from '../review/brief';

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
  const hostRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [viewMode, setViewMode] = useState<ViewMode>('spread');
  const [audit, setAudit] = useState<LayoutAuditReport | null>(null);
  const [labEnabled, setLabEnabled] = useState(false);
  const [labSettings, setLabSettings] =
    useState<LayoutLabSettings>(DEFAULT_LAYOUT_LAB);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );

  const labCss = useMemo(
    () => buildLayoutLabCss(project.manifest, labSettings),
    [project.manifest, labSettings],
  );

  useEffect(() => {
    setPage(1);
    setPageCount(null);
    setAudit(null);
    setLabEnabled(false);
    setLabSettings(DEFAULT_LAYOUT_LAB);
    setCopyState('idle');
    return () => publication.dispose();
  }, [publication]);

  const auditRenderedPages = useCallback(() => {
    window.setTimeout(() => {
      if (!hostRef.current) return;
      setAudit(runLayoutAudit(hostRef.current));
    }, 180);
  }, []);

  const pageNumbers = pageCount
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : [];

  const currentMetric = audit?.pages.find((metric) => metric.page === page);
  const warningCount =
    audit?.issues.filter((issue) => issue.severity === 'warning').length ?? 0;
  const infoCount =
    audit?.issues.filter((issue) => issue.severity === 'info').length ?? 0;

  return (
    <section className="reviewSurface">
      <header className="reviewHeader">
        <div>
          <p className="eyebrow">Publication review</p>
          <h2>Inspect and diagnose the designed pages</h2>
          <p>
            Read-only Vivliostyle review of commit{' '}
            {project.snapshot.commitSha.slice(0, 7)}. Review state never changes
            Git source.
          </p>
        </div>
        <div className="reviewState">
          <span>{viewMode === 'spread' ? 'Spread' : 'Single page'}</span>
          <span>{Math.round(zoom * 100) + '%'}</span>
          <span>{pageCount ? pageCount + ' pages' : 'Paginating…'}</span>
          {audit ? <span>{warningCount + ' layout warnings'}</span> : null}
          {labEnabled ? <span>Layout Lab active</span> : null}
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

        <button
          type="button"
          className="secondaryButton reviewAuditButton"
          onClick={auditRenderedPages}
        >
          Run layout audit
        </button>

        <button
          type="button"
          className="reviewBriefButton"
          onClick={async () => {
            try {
              await copyReviewText(
                buildImprovementBrief(
                  project,
                  page,
                  audit,
                  labEnabled,
                  labSettings,
                ),
              );
              setCopyState('copied');
              window.setTimeout(() => setCopyState('idle'), 2200);
            } catch {
              setCopyState('error');
            }
          }}
        >
          {copyState === 'copied'
            ? 'Brief copied'
            : copyState === 'error'
              ? 'Copy failed'
              : 'Copy improvement brief'}
        </button>
      </div>

      {pageNumbers.length ? (
        <nav className="reviewPageRail" aria-label="Page navigator">
          {pageNumbers.map((pageNumber) => {
            const flagged = audit?.issues.some(
              (issue) => issue.page === pageNumber,
            );
            return (
              <button
                type="button"
                key={pageNumber}
                className={
                  pageNumber === page
                    ? 'reviewPageChip reviewPageChipActive'
                    : flagged
                      ? 'reviewPageChip reviewPageChipFlagged'
                      : 'reviewPageChip'
                }
                aria-label={'Go to page ' + pageNumber}
                aria-current={pageNumber === page ? 'page' : undefined}
                onClick={() => setPage(pageNumber)}
              >
                <span>{pageNumber}</span>
                {flagged ? <i aria-hidden="true" /> : null}
              </button>
            );
          })}
        </nav>
      ) : null}

      <div className="reviewWorkspace">
        <div className="reviewCanvas" ref={hostRef}>
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
            authorStyleSheet={labEnabled ? labCss : undefined}
            onLoad={(state) => {
              setPageCount(state.epageCount);
              setPage(Math.min(page, Math.max(1, state.epageCount)));
              auditRenderedPages();
            }}
            onNavigation={(state) => {
              if (state.epage >= 0) setPage(state.epage + 1);
            }}
          />
        </div>

        <aside className="layoutAuditPanel">
          <LayoutLabPanel
            enabled={labEnabled}
            settings={labSettings}
            onEnabledChange={setLabEnabled}
            onChange={setLabSettings}
            onReset={() => {
              setLabSettings(DEFAULT_LAYOUT_LAB);
              setLabEnabled(false);
            }}
          />

          <header>
            <div>
              <p className="eyebrow">Layout audit</p>
              <strong>
                {audit
                  ? warningCount + ' warnings · ' + infoCount + ' notes'
                  : 'Waiting for rendered pages'}
              </strong>
            </div>
            <button
              type="button"
              className="secondaryButton"
              onClick={auditRenderedPages}
            >
              Refresh
            </button>
          </header>

          {currentMetric ? (
            <div className="pageMetricGrid">
              <div>
                <span>Page</span>
                <strong>{currentMetric.page}</strong>
              </div>
              <div>
                <span>Text</span>
                <strong>{currentMetric.textCharacters + ' chars'}</strong>
              </div>
              <div>
                <span>Images</span>
                <strong>{currentMetric.imageCount}</strong>
              </div>
              <div>
                <span>Image area</span>
                <strong>
                  {Math.round(currentMetric.imageAreaRatio * 100) + '%'}
                </strong>
              </div>
            </div>
          ) : null}

          <div className="layoutIssueList">
            {!audit ? (
              <p className="layoutAuditEmpty">
                The audit starts automatically after pagination. It inspects
                the rendered Vivliostyle page boxes, not only source markup.
              </p>
            ) : audit.issues.length === 0 ? (
              <p className="layoutAuditEmpty">
                No heuristic layout flags found. Visual review is still
                required before publication.
              </p>
            ) : (
              audit.issues.map((issue, index) => (
                <button
                  type="button"
                  key={issue.code + '-' + issue.page + '-' + index}
                  className={'layoutIssue layoutIssue-' + issue.severity}
                  onClick={() => setPage(issue.page)}
                >
                  <span>Page {issue.page}</span>
                  <strong>{issue.message}</strong>
                  <small>{issue.code}</small>
                </button>
              ))
            )}
          </div>

          <p className="layoutAuditDisclaimer">
            Heuristic review flags are design prompts, not publishing errors.
            Technical release blockers remain in Preflight.
          </p>
        </aside>
      </div>
    </section>
  );
}
