import { useMemo } from 'react';

import type { LoadedProject } from '../lib/load-project';
import { runPreflight } from '../preflight/checks';

export function PreflightPanel({ project }: { project: LoadedProject }) {
  const report = useMemo(
    () => runPreflight(project),
    [project.snapshot.commitSha],
  );

  return (
    <section className="preflightSurface">
      <header className="surfaceHeader">
        <div>
          <p className="eyebrow">Preflight</p>
          <h2>{report.ready ? 'Ready for export' : 'Publication needs attention'}</h2>
          <p>
            Source and generated EPUB package checked against commit{' '}
            {project.snapshot.commitSha.slice(0, 7)}.
          </p>
        </div>
        <div className={report.ready ? 'preflightState preflightReady' : 'preflightState preflightBlocked'}>
          {report.ready ? 'Pass' : 'Errors'}
        </div>
      </header>

      <div className="preflightTotals">
        <div><strong>{report.errors}</strong><span>Errors</span></div>
        <div><strong>{report.warnings}</strong><span>Warnings</span></div>
        <div><strong>{report.info}</strong><span>Info</span></div>
      </div>

      <div className="issueList">
        {report.issues.length === 0 ? (
          <p className="surfaceNote">No preflight issues found.</p>
        ) : (
          report.issues.map((issue, index) => (
            <article
              key={`${issue.code}-${issue.path ?? ''}-${index}`}
              className={`issueItem issue-${issue.severity}`}
            >
              <span className="issueSeverity">{issue.severity}</span>
              <div>
                <strong>{issue.message}</strong>
                <p>
                  {issue.category} · {issue.code}
                  {issue.path ? ` · ${issue.path}` : ''}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
