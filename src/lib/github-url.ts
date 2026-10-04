export interface RepositoryTarget {
  owner: string;
  repo: string;
  ref?: string;
}

export function parseRepositoryTarget(input: string): RepositoryTarget {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Enter a GitHub repository.');
  }

  const normalized = trimmed
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const [repositoryPart, ref] = normalized.split('@', 2);
  const [owner, repo, ...rest] = repositoryPart.split('/');

  if (!owner || !repo || rest.length > 0) {
    throw new Error('Use owner/repository or a GitHub repository URL.');
  }

  return { owner, repo, ref: ref || undefined };
}
