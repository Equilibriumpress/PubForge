import { parsePublicationManifest } from './manifest';
import { normalizeManifestPaths } from './publications';
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
  manifestPath: string;
}

export async function loadGitHubProject(
  target: RepositoryTarget,
  manifestPath = 'publication.yml',
  onProgress?: (done: number, total: number) => void,
): Promise<LoadedProject> {
  const provider = new GitHubStorageProvider(target);
  const snapshot = await provider.open();

  if (!provider.stat(manifestPath)) {
    throw new Error(`Publication manifest not found: ${manifestPath}`);
  }

  const manifest = normalizeManifestPaths(
    parsePublicationManifest(await provider.readText(manifestPath)),
    manifestPath,
    provider,
  );

  for (const entry of manifest.content) {
    const path = typeof entry === 'string' ? entry : entry.path;
    if (!provider.stat(path)) {
      throw new Error(`Content file declared in ${manifestPath} is missing: ${path}`);
    }
  }

  if (!provider.stat(manifest.theme.css)) {
    throw new Error(
      `Theme file declared in ${manifestPath} is missing: ${manifest.theme.css}`,
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
    manifestPath,
  };
}
