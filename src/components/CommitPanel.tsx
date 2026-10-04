import { useState } from 'react';

import type { LoadedProject } from '../lib/load-project';

interface CommitPanelProps {
  project: LoadedProject;
  onCommitted(): Promise<void> | void;
}

export function CommitPanel({ project, onCommitted }: CommitPanelProps) {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('Update publication');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const changedPaths = project.workspace.changedPaths();

  async function commit() {
    if (!token.trim() || changedPaths.length === 0) return;

    setBusy(true);
    setStatus('Checking remote branch…');
    try {
      const changes = project.workspace.changeSet();
      setStatus('Creating Git commit…');
      const sha = await project.provider.commitChanges({
        token: token.trim(),
        message: message.trim() || 'Update publication',
        writes: changes.writes,
        deletes: changes.deletes,
      });
      setToken('');
      setStatus(`Committed ${sha.slice(0, 7)}. Reloading project…`);
      await onCommitted();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to commit changes.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="studioCard commitPanel">
      <header className="studioPanelHeader">
        <div>
          <p className="eyebrow">GitHub write-back</p>
          <strong>{project.snapshot.repository}@{project.snapshot.ref}</strong>
        </div>
        <span className="dirtyBadge">{changedPaths.length} changed</span>
      </header>

      <div className="commitContent">
        <div className="commitChanges">
          <h3>Changes</h3>
          {changedPaths.length ? (
            <ul>
              {changedPaths.map((path) => <li key={path}>{path}</li>)}
            </ul>
          ) : (
            <p>No local changes to commit.</p>
          )}
        </div>

        <label>
          Commit message
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Update publication"
          />
        </label>

        <label>
          Fine-grained GitHub token
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Contents: Read and write"
          />
        </label>

        <p className="panelFootnote commitNote">
          The token stays in this browser tab's React state and is cleared after
          a successful commit. PubForge does not store it in the project or browser storage.
        </p>

        <button
          type="button"
          onClick={() => void commit()}
          disabled={busy || !token.trim() || changedPaths.length === 0}
        >
          {busy ? 'Committing…' : 'Commit to GitHub'}
        </button>

        {status ? <p className="commitStatus" role="status">{status}</p> : null}
      </div>
    </section>
  );
}
