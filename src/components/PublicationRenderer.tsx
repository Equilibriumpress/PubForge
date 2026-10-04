import { useState } from 'react';

import type { LoadedProject } from '../lib/load-project';
import { ExportPanel } from './ExportPanel';
import { PublicationPreview } from './PublicationPreview';

type RendererTab = 'preview' | 'preflight' | 'output';

function PreflightSummary({ project }: { project: LoadedProject }) {
  const missing: string[] = [];
  for (const entry of project.manifest.content) {
    const path = typeof entry === 'string' ? entry : entry.path;
    if (!project.workspace.has(path)) missing.push(path);
  }
  if (!project.workspace.has(project.manifest.theme.css)) {
    missing.push(project.manifest.theme.css);
  }

  const checks = [
    {
      label: 'Manifest',
      ok: true,
      detail: 'publication.yml parsed successfully',
    },
    {
      label: 'Reading order',
      ok: project.manifest.content.length > 0,
      detail: `${project.manifest.content.length} source files`,
    },
    {
      label: 'Required files',
      ok: missing.length === 0,
      detail: missing.length ? `Missing: ${missing.join(', ')}` : 'All declared files present',
    },
    {
      label: 'Renderer',
      ok: true,
      detail: 'Vivliostyle preview ready',
    },
  ];

  return (
    <section className="preflightSurface">
      <header className="surfaceHeader">
        <div>
          <p className="eyebrow">Preflight</p>
          <h2>Publication readiness</h2>
        </div>
        <span className="snapshotBadge">{project.snapshot.commitSha.slice(0, 7)}</span>
      </header>
      <div className="preflightGrid">
        {checks.map((check) => (
          <article key={check.label} className={check.ok ? 'checkCard checkPass' : 'checkCard checkFail'}>
            <span className="checkMark">{check.ok ? '✓' : '!'}</span>
            <div>
              <strong>{check.label}</strong>
              <p>{check.detail}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="surfaceNote">
        PR18 expands this into full publication QA for assets, links, metadata,
        EPUB semantics and print risks.
      </p>
    </section>
  );
}

export function PublicationRenderer({ project }: { project: LoadedProject }) {
  const [tab, setTab] = useState<RendererTab>('preview');
  const githubUrl = `https://github.com/${project.snapshot.repository}/tree/${project.snapshot.commitSha}`;

  return (
    <section className="rendererShell">
      <header className="rendererHeader">
        <div>
          <p className="eyebrow">Publication renderer</p>
          <h2>{project.manifest.title}</h2>
          {project.manifest.subtitle ? <p>{project.manifest.subtitle}</p> : null}
        </div>
        <div className="rendererMeta">
          <span>{project.manifest.type ?? 'publication'}</span>
          <span>{project.manifest.language}</span>
          <a href={githubUrl} target="_blank" rel="noreferrer">
            {project.snapshot.repository} · {project.snapshot.commitSha.slice(0, 7)}
          </a>
        </div>
      </header>

      <nav className="rendererTabs" aria-label="Publication views">
        {(['preview', 'preflight', 'output'] as RendererTab[]).map((value) => (
          <button
            key={value}
            type="button"
            className={tab === value ? 'rendererTab rendererTabActive' : 'rendererTab'}
            onClick={() => setTab(value)}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </nav>

      <div className="rendererSurface">
        {tab === 'preview' ? <PublicationPreview project={project} /> : null}
        {tab === 'preflight' ? <PreflightSummary project={project} /> : null}
        {tab === 'output' ? <ExportPanel project={project} /> : null}
      </div>
    </section>
  );
}
