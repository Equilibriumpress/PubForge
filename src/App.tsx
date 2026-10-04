import { useState } from 'react';

const SAMPLE_REPO = 'Equilibriumpress/PubForge';

export function App() {
  const [repository, setRepository] = useState(SAMPLE_REPO);

  function openProject() {
    const params = new URLSearchParams(window.location.search);
    params.set('repo', repository.trim());
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  }

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
            placeholder="owner/repository"
          />
          <button type="button" onClick={openProject}>
            Open project
          </button>
        </div>
        <p className="hint">
          Version 0.1 starts with public repositories. GitHub remains the source
          of truth.
        </p>
      </section>

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
    </main>
  );
}
