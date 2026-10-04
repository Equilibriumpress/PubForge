import type { LoadedProject } from '../lib/load-project';
import { downloadBytes, slugify, zipFiles } from './utils';

export function exportProjectZip(project: LoadedProject): void {
  const archive = zipFiles(project.workspace.sourceEntries(), {
    'pubforge-source.json': JSON.stringify(
      {
        repository: project.snapshot.repository,
        ref: project.snapshot.ref,
        commit: project.snapshot.commitSha,
      },
      null,
      2,
    ),
  });

  downloadBytes(
    archive,
    `${slugify(project.manifest.title)}-project.zip`,
    'application/zip',
  );
}
