import { useEffect, useState } from 'react';

import type { LoadedProject } from '../lib/load-project';
import type { GitHubHistoryEntry } from '../storage/github';

interface HistoryPanelProps {
  project: LoadedProject;
  onOpenCommit(sha: string): Promise<void> | void;
}

export function HistoryPanel({ project, onOpenCommit }: HistoryPanelProps) {
  const [entries, setEntries] = useState<GitHubHistoryEntry[]>([]);
  const [status, setStatus] = useState('Loading history…');

  useEffect(() => {
    let active = true;
    void project.provider
      .listHistory(30)
      .then((items) => {
        if (!active) return;
        setEntries(items);
        setStatus(items.length ? '' : 'No commits found.');
      })
      .catch((error) => {
        if (!active) return;
        setStatus(error instanceof Error ? error.message : 'Unable to load history.');
      });
    return () => {
      active = false;
    };
  }, [project]);

  return (
    <section className="studioCard historyPanel">
      <header className="studioPanelHeader">
        <div>
          <p className="eyebrow">Version history</p>
          <strong>{project.snapshot.repository}</strong>
        </div>
        <span>{entries.length} commits</span>
      </header>

      {status ? <p className="historyStatus" role="status">{status}</p> : null}

      <div className="historyList">
        {entries.map((entry) => {
          const current = entry.sha === project.snapshot.commitSha;
          return (
            <article key={entry.sha} className={current ? 'historyItem historyCurrent' : 'historyItem'}>
              <div className="historyMeta">
                <strong>{entry.message}</strong>
                <span>
                  {entry.author}
                  {' · '}
                  {new Date(entry.date).toLocaleString()}
                  {' · '}
                  {entry.sha.slice(0, 7)}
                </span>
              </div>
              {current ? (
                <span className="dirtyBadge">Current snapshot</span>
              ) : (
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => void onOpenCommit(entry.sha)}
                >
                  Open snapshot
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
