import { useEffect, useState } from 'react';

import { ExportPanel } from './components/ExportPanel';
import { PublicationPreview } from './components/PublicationPreview';
import { parseRepositoryTarget } from './lib/github-url';
import { loadGitHubProject, type LoadedProject } from './lib/load-project';

const SAMPLE_REPO = 'Equilibriumpress/PubForge';

export function App() {
  const params = new URLSearchParams(window.location.search);
  const [repository, setRepository] = useState(params.get('repo') ?? SAMPLE_REPO);
  const [project, setProject] = useState<LoadedProject | null>(null);
  const [status, setStatus] = useState('Enter a public GitHub publication repository.');
  const [loading, setLoading] = useState(false);

  async function openProject(input = repository) {
    setLoading(true);
    setProject(null);
    setStatus('Reading repository…');

    try {
      const target = parseRepositoryTarget(input);
      const loaded = await loadGitHubProject(target, (done, total) => {
        setStatus(`Preparing browser workspace… ${done}/${total}`);
      });
      setProject(loaded);
      setStatus(
        `Loaded ${loaded.snapshot.repository}@${loaded.snapshot.ref} · ${loaded.snapshot.commitSha.slice(0, 7)} · browser workspace ready`,
      );

      const next = new URLSearchParams(window.location.search);
      next.set('repo', input.trim());
      window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to open repository.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('repo');
    if (initial) {
      void openProject(initial);
    }
  }, []);

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Git-native publishing</p>
        <h1>PubForge</h1>
        <p className="lede">
          Open a publication repository, render it in the browser, and export it
          without moving the project into a separate CMS.
        </p>
      </header>

      <section className="panel">
        <label htmlFor="repo">GitHub repository</label>
        <div className="repoRow">
          <input
            id="repo"
            value={repository}
            onChange={(event) => setRepository(event.target.value)}
            placeholder="owner/repository or owner/repository@branch"
          />
          <button type="button" onClick={() => void openProject()} disabled={loading}>
            {loading ? 'Opening…' : 'Open project'}
          </button>
        </div>
        <p className="hint" role="status">
          {status}
        </p>
      </section>

      {project ? (
        <>
          <section className="projectSummary">
            <div>
              <p className="eyebrow">Publication</p>
              <h2>{project.manifest.title}</h2>
              {project.manifest.subtitle ? <p>{project.manifest.subtitle}</p> : null}
            </div>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{project.manifest.type ?? 'custom'}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{project.manifest.language}</dd>
              </div>
              <div>
                <dt>Files</dt>
                <dd>{project.workspace.list().length}</dd>
              </div>
              <div>
                <dt>Commit</dt>
                <dd>{project.snapshot.commitSha.slice(0, 7)}</dd>
              </div>
            </dl>
          </section>
          <PublicationPreview project={project} />
          <ExportPanel project={project} />
        </>
      ) : (
        <section className="grid">
          <article className="card">
            <span>01</span>
            <h2>GitHub project</h2>
            <p>Content, assets, themes and configuration stay in one repository.</p>
          </article>
          <article className="card">
            <span>02</span>
            <h2>Browser rendering</h2>
            <p>Publication rendering runs in the browser instead of a render server.</p>
          </article>
          <article className="card">
            <span>03</span>
            <h2>Portable output</h2>
            <p>The same project becomes print, EPUB and Web Publication output.</p>
          </article>
        </section>
      )}
    </main>
  );
}
