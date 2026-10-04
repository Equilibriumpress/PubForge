import { useEffect, useState } from 'react';

import { PublicationRenderer } from './components/PublicationRenderer';
import { parseRepositoryTarget } from './lib/github-url';
import { loadGitHubProject, type LoadedProject } from './lib/load-project';

const SAMPLE_REPO = 'Equilibriumpress/PubForge';

export function App() {
  const params = new URLSearchParams(window.location.search);
  const [repository, setRepository] = useState(params.get('repo') ?? SAMPLE_REPO);
  const [project, setProject] = useState<LoadedProject | null>(null);
  const [status, setStatus] = useState('Open a public GitHub publication repository.');
  const [loading, setLoading] = useState(false);

  async function openProject(input = repository) {
    setRepository(input);
    setLoading(true);
    setProject(null);
    setStatus('Reading publication snapshot…');

    try {
      const target = parseRepositoryTarget(input);
      const loaded = await loadGitHubProject(target, (done, total) => {
        setStatus(`Preparing publication assets… ${done}/${total}`);
      });
      setProject(loaded);
      setStatus(
        `Ready · ${loaded.snapshot.repository}@${loaded.snapshot.ref} · ${loaded.snapshot.commitSha.slice(0, 7)}`,
      );

      const next = new URLSearchParams(window.location.search);
      next.set('repo', input.trim());
      window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to open publication.');
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
      <header className="hero rendererHero">
        <p className="eyebrow">Git-native publication rendering</p>
        <h1>PubForge</h1>
        <p className="lede">
          ChatGPT edits the publication in GitHub. PubForge turns that committed
          source into a high-fidelity preview and publication outputs.
        </p>
      </header>

      <section className="panel projectOpener">
        <label htmlFor="repo">Publication repository</label>
        <div className="repoRow">
          <input
            id="repo"
            value={repository}
            onChange={(event) => setRepository(event.target.value)}
            placeholder="owner/repository or owner/repository@branch"
          />
          <button type="button" onClick={() => void openProject()} disabled={loading}>
            {loading ? 'Opening…' : 'Render publication'}
          </button>
        </div>
        <p className="hint" role="status">{status}</p>
      </section>

      {project ? (
        <PublicationRenderer key={project.snapshot.commitSha} project={project} />
      ) : (
        <section className="rendererIntro">
          <article>
            <span>Preview</span>
            <strong>Inspect the actual paginated publication.</strong>
          </article>
          <article>
            <span>Preflight</span>
            <strong>Catch publication problems before export.</strong>
          </article>
          <article>
            <span>Output</span>
            <strong>Produce PDF, EPUB and Web Publication formats.</strong>
          </article>
        </section>
      )}
    </main>
  );
}
