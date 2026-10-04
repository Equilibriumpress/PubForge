import { useEffect, useMemo, useState } from 'react';
import { PageViewMode } from '@vivliostyle/core';
import { Renderer } from '@vivliostyle/react';

import { compilePublication } from '../engine/compile';
import { loadGitHubProject, type LoadedProject } from '../lib/load-project';
import { manifestDirectory } from '../lib/publications';
import { runPreflight } from '../preflight/checks';
import { buildPublicationDocument } from '../render/build-html';
import { copyReviewText } from '../review/brief';
import type { RepositoryCommit } from '../storage/github';

interface ComparePanelProps {
  project: LoadedProject;
}

function sourceFiles(project: LoadedProject): Map<string, string> {
  const compiled = compilePublication(project);
  const paths = new Set<string>([
    project.manifestPath,
    ...compiled.chapters.map((chapter) => chapter.sourcePath),
    ...compiled.assetPaths,
    ...compiled.themePaths,
  ]);
  const sourceSha = new Map(
    project.snapshot.files.map((file) => [file.path, file.sha]),
  );
  const result = new Map<string, string>();
  for (const path of paths) {
    const sha = sourceSha.get(path);
    if (sha) result.set(path, sha);
  }
  return result;
}

function changedSourceFiles(
  current: LoadedProject,
  previous: LoadedProject,
): string[] {
  const currentFiles = sourceFiles(current);
  const previousFiles = sourceFiles(previous);
  const paths = new Set([...currentFiles.keys(), ...previousFiles.keys()]);
  return [...paths]
    .filter((path) => currentFiles.get(path) !== previousFiles.get(path))
    .sort();
}

function comparisonBrief(
  current: LoadedProject,
  previous: LoadedProject,
  currentPages: number | null,
  previousPages: number | null,
  changedFiles: string[],
): string {
  const currentPreflight = runPreflight(current);
  const previousPreflight = runPreflight(previous);

  return [
    'PubForge commit comparison brief',
    '',
    'Publication: ' + current.manifest.publication.title,
    'Repository: ' + current.snapshot.repository,
    'Manifest: ' + current.manifestPath,
    '',
    'Current commit: ' + current.snapshot.commitSha,
    'Previous commit: ' + previous.snapshot.commitSha,
    '',
    'Rendered pages:',
    '- current: ' + (currentPages ?? 'not counted'),
    '- previous: ' + (previousPages ?? 'not counted'),
    '',
    'Preflight:',
    '- current: ' +
      currentPreflight.errors +
      ' errors, ' +
      currentPreflight.warnings +
      ' warnings',
    '- previous: ' +
      previousPreflight.errors +
      ' errors, ' +
      previousPreflight.warnings +
      ' warnings',
    '',
    'Changed publication source files:',
    ...(changedFiles.length
      ? changedFiles.map((path) => '- ' + path)
      : ['- none detected in the compiled publication resource graph']),
    '',
    'Requested workflow:',
    '- compare the two source snapshots and the publication intent',
    '- explain which changes improved or degraded layout/output',
    '- preserve improvements and correct regressions in GitHub source',
    '- keep changes coherent and commit them atomically',
    '- re-run PubForge Review, Preflight and Output on the new commit',
  ].join('\n');
}

export function ComparePanel({ project }: ComparePanelProps) {
  const [commits, setCommits] = useState<RepositoryCommit[]>([]);
  const [selectedSha, setSelectedSha] = useState('');
  const [previous, setPrevious] = useState<LoadedProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(0.65);
  const [currentPages, setCurrentPages] = useState<number | null>(null);
  const [previousPages, setPreviousPages] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );

  const currentDocument = useMemo(
    () => buildPublicationDocument(project),
    [project.snapshot.commitSha, project.manifestPath],
  );
  const previousDocument = useMemo(
    () => (previous ? buildPublicationDocument(previous) : null),
    [previous?.snapshot.commitSha, previous?.manifestPath],
  );

  useEffect(() => {
    return () => currentDocument.dispose();
  }, [currentDocument]);

  useEffect(() => {
    return () => previousDocument?.dispose();
  }, [previousDocument]);

  useEffect(() => {
    let cancelled = false;
    setHistoryError(null);

    const directory = manifestDirectory(project.manifestPath);
    project.provider
      .listCommits(16, directory || undefined)
      .then((items) => {
        if (cancelled) return;
        const candidates = items.filter(
          (item) => item.sha !== project.snapshot.commitSha,
        );
        setCommits(candidates);
        setSelectedSha(candidates[0]?.sha ?? '');
      })
      .catch((error) => {
        if (cancelled) return;
        setHistoryError(
          error instanceof Error ? error.message : 'Unable to read Git history.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [project.snapshot.commitSha, project.manifestPath]);

  const changedFiles = useMemo(
    () => (previous ? changedSourceFiles(project, previous) : []),
    [project, previous],
  );

  const currentPreflight = useMemo(() => runPreflight(project), [project]);
  const previousPreflight = useMemo(
    () => (previous ? runPreflight(previous) : null),
    [previous],
  );

  async function loadComparison() {
    if (!selectedSha) return;

    setLoading(true);
    setCompareError(null);
    setPrevious(null);
    setPage(1);
    setCurrentPages(null);
    setPreviousPages(null);

    try {
      const [owner, repo] = project.snapshot.repository.split('/');
      const loaded = await loadGitHubProject(
        { owner, repo, ref: selectedSha },
        project.manifestPath,
      );
      setPrevious(loaded);
    } catch (error) {
      setCompareError(
        error instanceof Error
          ? error.message
          : 'Unable to load the selected snapshot.',
      );
    } finally {
      setLoading(false);
    }
  }

  const previousCommit = commits.find((commit) => commit.sha === selectedSha);

  function previousSnapshotUrl(): string | null {
    if (!previous) return null;
    const url = new URL(window.location.href);
    url.searchParams.set(
      'repo',
      previous.snapshot.repository + '@' + previous.snapshot.commitSha,
    );
    url.searchParams.set('manifest', previous.manifestPath);
    url.searchParams.delete('print');
    url.searchParams.delete('edition');
    return url.toString();
  }

  return (
    <section className="compareSurface">
      <header className="surfaceHeader compareHeader">
        <div>
          <p className="eyebrow">Commit compare</p>
          <h2>Compare publication snapshots</h2>
          <p>
            Current commit {project.snapshot.commitSha.slice(0, 7)} stays on the
            left. Load an earlier Git snapshot on the right and review the same
            page in both Vivliostyle renders.
          </p>
        </div>
      </header>

      <div className="compareControls">
        <label>
          <span>Earlier commit</span>
          <select
            value={selectedSha}
            onChange={(event) => setSelectedSha(event.target.value)}
            disabled={loading || commits.length === 0}
          >
            {commits.length === 0 ? (
              <option value="">No earlier publication commits found</option>
            ) : null}
            {commits.map((commit) => (
              <option key={commit.sha} value={commit.sha}>
                {commit.sha.slice(0, 7) + ' · ' + commit.message}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void loadComparison()}
          disabled={!selectedSha || loading}
        >
          {loading ? 'Loading snapshot…' : 'Compare commit'}
        </button>

        <label className="compareZoom">
          <span>Zoom</span>
          <select
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          >
            <option value={0.5}>50%</option>
            <option value={0.65}>65%</option>
            <option value={0.8}>80%</option>
          </select>
        </label>

        {previous ? (
          <button
            type="button"
            className="secondaryButton"
            onClick={async () => {
              try {
                await copyReviewText(
                  comparisonBrief(
                    project,
                    previous,
                    currentPages,
                    previousPages,
                    changedFiles,
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
              ? 'Comparison copied'
              : copyState === 'error'
                ? 'Copy failed'
                : 'Copy comparison brief'}
          </button>
        ) : null}
      </div>

      {historyError ? <p className="compareError">{historyError}</p> : null}
      {compareError ? <p className="compareError">{compareError}</p> : null}

      {previous ? (
        <>
          <div className="compareMetrics">
            <article>
              <span>Current</span>
              <strong>{project.snapshot.commitSha.slice(0, 7)}</strong>
              <p>
                {currentPages ?? '…'} pages · {currentPreflight.errors} errors ·{' '}
                {currentPreflight.warnings} warnings
              </p>
            </article>
            <article>
              <span>Previous</span>
              <strong>{previous.snapshot.commitSha.slice(0, 7)}</strong>
              <p>
                {previousPages ?? '…'} pages · {previousPreflight?.errors ?? 0}{' '}
                errors · {previousPreflight?.warnings ?? 0} warnings
              </p>
            </article>
            <article>
              <span>Source delta</span>
              <strong>{changedFiles.length}</strong>
              <p>compiled publication files changed</p>
            </article>
          </div>

          <div className="comparePageControls">
            <button
              type="button"
              className="secondaryButton"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
            >
              Previous page
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              className="secondaryButton"
              onClick={() =>
                setPage((value) =>
                  Math.min(
                    Math.max(currentPages ?? value + 1, previousPages ?? value + 1),
                    value + 1,
                  ),
                )
              }
              disabled={
                currentPages !== null &&
                previousPages !== null &&
                page >= Math.max(currentPages, previousPages)
              }
            >
              Next page
            </button>
            {previousSnapshotUrl() ? (
              <a
                className="compareSnapshotLink"
                href={previousSnapshotUrl() ?? undefined}
                target="_blank"
                rel="noreferrer"
              >
                Open previous snapshot
              </a>
            ) : null}
          </div>

          <div className="compareCanvasGrid">
            <section>
              <header>
                <strong>Current</strong>
                <small>{project.snapshot.commitSha.slice(0, 7)}</small>
              </header>
              <div className="compareCanvas">
                <Renderer
                  source={currentDocument.url}
                  page={page}
                  zoom={zoom}
                  bookMode={false}
                  pageViewMode={PageViewMode.SINGLE_PAGE}
                  renderAllPages
                  onLoad={(state) => setCurrentPages(state.epageCount)}
                  onNavigation={(state) => {
                    if (state.epage > 0) setPage(Math.max(1, state.epage));
                  }}
                />
              </div>
            </section>

            <section>
              <header>
                <strong>Previous</strong>
                <small>
                  {previousCommit?.message ??
                    previous.snapshot.commitSha.slice(0, 7)}
                </small>
              </header>
              <div className="compareCanvas">
                <Renderer
                  source={previousDocument?.url ?? ''}
                  page={page}
                  zoom={zoom}
                  bookMode={false}
                  pageViewMode={PageViewMode.SINGLE_PAGE}
                  renderAllPages
                  onLoad={(state) => setPreviousPages(state.epageCount)}
                  onNavigation={(state) => {
                    if (state.epage > 0) setPage(Math.max(1, state.epage));
                  }}
                />
              </div>
            </section>
          </div>

          <details className="compareChangedFiles">
            <summary>
              {changedFiles.length + ' changed publication source files'}
            </summary>
            {changedFiles.length ? (
              <ul>
                {changedFiles.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            ) : (
              <p>No changed files detected in the compiled resource graph.</p>
            )}
          </details>
        </>
      ) : (
        <div className="compareEmpty">
          <strong>Select an earlier commit.</strong>
          <p>
            Compare renders are loaded only on demand so normal publication
            review stays fast.
          </p>
        </div>
      )}
    </section>
  );
}
