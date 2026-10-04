import { useEffect, useState } from 'react';

import { PublicationLauncher } from './components/PublicationLauncher';
import { PublicationRenderer } from './components/PublicationRenderer';
import { PublicationPrintView } from './components/PublicationPrintView';
import type { PdfEdition } from './engine/output-profile';
import { parseRepositoryTarget } from './lib/github-url';
import { loadGitHubProject, type LoadedProject } from './lib/load-project';
import {
  discoverGitHubPublications,
  type PublicationDescriptor,
} from './lib/publications';

const SAMPLE_REPO = 'Equilibriumpress/PubForge';

export function App() {
  const params = new URLSearchParams(window.location.search);
  const printMode = params.get('print') === '1';
  const requestedEdition = params.get('edition');
  const edition: PdfEdition =
    requestedEdition === 'print' || requestedEdition === 'high-quality'
      ? requestedEdition
      : 'normal';

  const initialRepository = params.get('repo') ?? SAMPLE_REPO;
  const initialManifest = params.get('manifest');

  const [repository, setRepository] = useState(initialRepository);
  const [publications, setPublications] = useState<PublicationDescriptor[]>([]);
  const [activeManifest, setActiveManifest] = useState<string | undefined>(
    initialManifest ?? undefined,
  );
  const [project, setProject] = useState<LoadedProject | null>(null);
  const [status, setStatus] = useState('Reading publication repository…');
  const [loading, setLoading] = useState(false);

  function syncUrl(repoInput: string, manifestPath: string) {
    const next = new URLSearchParams(window.location.search);
    next.set('repo', repoInput.trim());
    next.set('manifest', manifestPath);

    if (!printMode) {
      next.delete('print');
      next.delete('edition');
    }

    window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
  }

  async function loadPublication(repoInput: string, manifestPath: string) {
    setLoading(true);
    setStatus(`Opening ${manifestPath}…`);

    try {
      const target = parseRepositoryTarget(repoInput);
      const loaded = await loadGitHubProject(
        target,
        manifestPath,
        (done, total) => {
          setStatus(`Preparing publication assets… ${done}/${total}`);
        },
      );

      setProject(loaded);
      setActiveManifest(manifestPath);
      setStatus(
        `Ready · ${loaded.manifest.publication.title} · ${loaded.snapshot.commitSha.slice(0, 7)}`,
      );
      syncUrl(repoInput, manifestPath);
    } catch (error) {
      setProject(null);
      setStatus(
        error instanceof Error ? error.message : 'Unable to open publication.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function openRepository(
    input = repository,
    requestedManifest?: string | null,
  ) {
    setRepository(input);
    setLoading(true);
    setProject(null);
    setPublications([]);
    setStatus('Discovering publications…');

    try {
      const target = parseRepositoryTarget(input);
      const discovery = await discoverGitHubPublications(target);
      setPublications(discovery.descriptors);

      const selectedPath =
        requestedManifest ??
        discovery.descriptors.find(
          (publication) => publication.manifestPath === 'publication.yml',
        )?.manifestPath ??
        discovery.descriptors[0].manifestPath;

      await loadPublication(input, selectedPath);
    } catch (error) {
      setProject(null);
      setStatus(
        error instanceof Error
          ? error.message
          : 'Unable to discover publications.',
      );
      setLoading(false);
    }
  }

  useEffect(() => {
    void openRepository(initialRepository, initialManifest);
  }, []);

  if (printMode && project) {
    return <PublicationPrintView project={project} edition={edition} />;
  }

  return (
    <main className="shell">
      <header className="hero rendererHero">
        <p className="eyebrow">Git-native publication rendering</p>
        <h1>PubForge</h1>
        <p className="lede">
          ChatGPT edits publications in GitHub. PubForge discovers committed
          publication manifests and turns each one into high-fidelity preview,
          preflight and output.
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
          <button
            type="button"
            onClick={() => void openRepository(repository)}
            disabled={loading}
          >
            {loading ? 'Opening…' : 'Open repository'}
          </button>
        </div>
        <p className="hint" role="status">
          {status}
        </p>
      </section>

      <PublicationLauncher
        publications={publications}
        activeManifest={activeManifest}
        loading={loading}
        onSelect={(manifestPath) =>
          void loadPublication(repository, manifestPath)
        }
      />

      {project ? (
        <PublicationRenderer
          key={`${project.snapshot.commitSha}:${project.manifestPath}`}
          project={project}
        />
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
