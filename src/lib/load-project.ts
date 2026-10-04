import { parsePublicationManifest } from './manifest';
import { GitHubStorageProvider } from '../storage/github';
import type { ProjectSnapshot } from '../storage/types';
import type { PublicationManifest } from '../types/publication';
import type { RepositoryTarget } from './github-url';

export interface LoadedProject {
  provider: GitHubStorageProvider;
  snapshot: ProjectSnapshot;
  manifest: PublicationManifest;
}

export async function loadGitHubProject(
  target: RepositoryTarget,
): Promise<LoadedProject> {
  const provider = new GitHubStorageProvider(target);
  const snapshot = await provider.open();

  if (!provider.stat('publication.yml')) {
    throw new Error('This repository does not contain publication.yml at its root.');
  }

  const manifest = parsePublicationManifest(
    await provider.readText('publication.yml'),
  );

  for (const entry of manifest.content) {
    const path = typeof entry === 'string' ? entry : entry.path;
    if (!provider.stat(path)) {
      throw new Error(`Content file declared in publication.yml is missing: ${path}`);
    }
  }

  if (!provider.stat(manifest.theme.css)) {
    throw new Error(
      `Theme file declared in publication.yml is missing: ${manifest.theme.css}`,
    );
  }

  return { provider, snapshot, manifest };
}
