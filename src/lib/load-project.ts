import { parsePublicationManifest } from './manifest';
import {
  prepareRichAssets,
  type PreparedAssets,
} from '../assets/prepare';
import { GitHubStorageProvider } from '../storage/github';
import type { ProjectSnapshot } from '../storage/types';
import {
  resolveThemePackages,
  type ResolvedThemePackages,
} from '../themes/resolve';
import type { PublicationManifest } from '../types/publication';
import { ProjectWorkspace } from '../workspace/workspace';
import type { RepositoryTarget } from './github-url';

export interface LoadedProject {
  provider: GitHubStorageProvider;
  snapshot: ProjectSnapshot;
  manifest: PublicationManifest;
  workspace: ProjectWorkspace;
  resolvedThemes: ResolvedThemePackages;
  preparedAssets: PreparedAssets;
}

export async function loadGitHubProject(
  target: RepositoryTarget,
  onProgress?: (done: number, total: number) => void,
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

  const workspace = await ProjectWorkspace.hydrate(
    provider,
    snapshot,
    onProgress,
  );

  const resolvedThemes = await resolveThemePackages(workspace, manifest);
  const preparedAssets = await prepareRichAssets(workspace, manifest);

  return {
    provider,
    snapshot,
    manifest,
    workspace,
    resolvedThemes,
    preparedAssets,
  };
}
