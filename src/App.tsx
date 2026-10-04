import { useEffect, useState } from 'react';

import { Studio } from './components/Studio';
import { TemplateGallery } from './components/TemplateGallery';
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
        `Loaded ${loaded.snapshot.repository}@${loaded.snapshot.ref} · ${loaded.snapshot.commitSha.slice(0, 7)}`,
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
    if (initial) void openProject(initial);
  }, []);

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Git-native publishing</p>
        <h1>PubForge</h1>
        <p className="lede">
          GitHub stores the project. PubForge edits, previews and exports the
          publication in your browser.
        </p>
      </header>

      <section className="panel projectOpener">
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
        <p className="hint" role="status">{status}</p>
      </section>

      {project ? (
        <Studio key={project.snapshot.commitSha} project={project} />
      ) : (
        <>
          <section className="grid">
            <article className="card">
              <span>01</span>
              <h2>Repository first</h2>
              <p>Content, assets, configuration and history remain ordinary Git files.</p>
            </article>
            <article className="card">
              <span>02</span>
              <h2>Local workspace</h2>
              <p>Edits and rendering run in the browser before anything is written back.</p>
            </article>
            <article className="card">
              <span>03</span>
              <h2>Publication output</h2>
              <p>One project feeds Vivliostyle preview, PDF, EPUB and Web Publication.</p>
            </article>
          </section>
          <TemplateGallery />
        </>
      )}
    </main>
  );
}
