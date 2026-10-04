import { useState } from 'react';

import type { LoadedProject } from '../lib/load-project';
import { ComparePanel } from './ComparePanel';
import { ExportPanel } from './ExportPanel';
import { PreflightPanel } from './PreflightPanel';
import { PublicationPreview } from './PublicationPreview';
import { ReviewPanel } from './ReviewPanel';

type RendererTab = 'preview' | 'review' | 'compare' | 'preflight' | 'output';

export function PublicationRenderer({ project }: { project: LoadedProject }) {
  const [tab, setTab] = useState<RendererTab>('preview');
  const githubUrl =
    `https://github.com/${project.snapshot.repository}/blob/` +
    `${project.snapshot.commitSha}/${project.manifestPath}`;

  return (
    <section className="rendererShell">
      <header className="rendererHeader">
        <div>
          <p className="eyebrow">Publication renderer</p>
          <h2>{project.manifest.publication.title}</h2>
          {project.manifest.publication.subtitle ? (
            <p>{project.manifest.publication.subtitle}</p>
          ) : null}
        </div>
        <div className="rendererMeta">
          <span>{project.manifest.publication.type ?? 'publication'}</span>
          <span>{project.manifest.publication.language}</span>
          <a href={githubUrl} target="_blank" rel="noreferrer">
            {project.snapshot.repository} · {project.manifestPath} ·{' '}
            {project.snapshot.commitSha.slice(0, 7)}
          </a>
        </div>
      </header>

      <nav className="rendererTabs" aria-label="Publication views">
        {(['preview', 'review', 'compare', 'preflight', 'output'] as RendererTab[]).map((value) => (
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
        {tab === 'review' ? <ReviewPanel project={project} /> : null}
        {tab === 'compare' ? <ComparePanel project={project} /> : null}
        {tab === 'preflight' ? <PreflightPanel project={project} /> : null}
        {tab === 'output' ? <ExportPanel project={project} /> : null}
      </div>
    </section>
  );
}
