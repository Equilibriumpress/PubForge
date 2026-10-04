import type { LoadedProject } from '../lib/load-project';
import type { LayoutAuditReport } from './layout-audit';
import {
  layoutLabSummary,
  type LayoutLabSettings,
} from './layout-lab';

export function buildImprovementBrief(
  project: LoadedProject,
  page: number,
  audit: LayoutAuditReport | null,
  labEnabled: boolean,
  labSettings: LayoutLabSettings,
): string {
  const lines: string[] = [
    'PubForge publication improvement brief',
    '',
    'Publication: ' + project.manifest.publication.title,
    'Repository: ' + project.snapshot.repository,
    'Commit: ' + project.snapshot.commitSha,
    'Manifest: ' + project.manifestPath,
    'Review page: ' + page,
    '',
  ];

  const currentMetric = audit?.pages.find((metric) => metric.page === page);
  const currentIssues =
    audit?.issues.filter((issue) => issue.page === page) ?? [];
  const otherWarnings =
    audit?.issues
      .filter(
        (issue) =>
          issue.page !== page && issue.severity === 'warning',
      )
      .slice(0, 8) ?? [];

  lines.push('Rendered layout review:');
  if (currentMetric) {
    lines.push(
      '- page text: ' + currentMetric.textCharacters + ' characters',
      '- images: ' + currentMetric.imageCount,
      '- image area: ' +
        Math.round(currentMetric.imageAreaRatio * 100) +
        '%',
    );
  } else {
    lines.push('- no rendered page metrics captured yet');
  }

  if (currentIssues.length) {
    for (const issue of currentIssues) {
      lines.push(
        '- page ' +
          issue.page +
          ' [' +
          issue.code +
          ']: ' +
          issue.message,
      );
    }
  } else {
    lines.push('- no heuristic flags on the selected page');
  }

  if (otherWarnings.length) {
    lines.push('', 'Other layout warnings:');
    for (const issue of otherWarnings) {
      lines.push(
        '- page ' +
          issue.page +
          ' [' +
          issue.code +
          ']: ' +
          issue.message,
      );
    }
  }

  const experiment = labEnabled ? layoutLabSummary(labSettings) : [];
  lines.push('', 'Temporary Layout Lab experiment:');
  if (experiment.length) {
    for (const item of experiment) lines.push('- ' + item);
  } else {
    lines.push('- none');
  }

  const likelyFiles = new Set<string>([
    project.manifestPath,
    project.manifest.theme.css,
    ...(currentMetric?.sourcePaths ?? []),
  ]);

  lines.push('', 'Likely source files:');
  for (const path of likelyFiles) lines.push('- ' + path);

  lines.push(
    '',
    'Requested workflow:',
    '- inspect these source files in GitHub',
    '- decide which review findings are intentional versus problems',
    '- implement the smallest coherent content/layout changes',
    '- keep GitHub as the source of truth',
    '- commit the changes atomically',
    '- do not add browser-side CMS state',
    '- re-open the new commit in PubForge for review, preflight and output',
  );

  return lines.join('\n');
}

export async function copyReviewText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}
