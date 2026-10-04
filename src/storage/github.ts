import type { FileMeta, ProjectSnapshot, StorageProvider } from './types';
import type { RepositoryTarget } from '../lib/github-url';

interface RepositoryResponse {
  default_branch: string;
}

interface CommitResponse {
  sha: string;
  commit: {
    tree: {
      sha: string;
    };
  };
}

interface TreeResponse {
  truncated: boolean;
  tree: Array<{
    path: string;
    mode: string;
    type: 'blob' | 'tree' | 'commit';
    sha: string;
    size?: number;
  }>;
}

const decoder = new TextDecoder();

function encodedPath(path: string): string {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const rateRemaining = response.headers.get('x-ratelimit-remaining');
    if (response.status === 403 && rateRemaining === '0') {
      throw new Error('GitHub API rate limit reached. Try again later or use a cached project.');
    }
    if (response.status === 404) {
      throw new Error('Repository or ref not found, or the repository is private.');
    }
    throw new Error(`GitHub request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export class GitHubStorageProvider implements StorageProvider {
  private snapshot: ProjectSnapshot | null = null;
  private fileIndex = new Map<string, FileMeta>();

  constructor(private readonly target: RepositoryTarget) {}

  async open(): Promise<ProjectSnapshot> {
    const repository = `${this.target.owner}/${this.target.repo}`;
    const apiRoot = `https://api.github.com/repos/${repository}`;

    const repositoryInfo = await githubJson<RepositoryResponse>(apiRoot);
    const ref = this.target.ref ?? repositoryInfo.default_branch;
    const commit = await githubJson<CommitResponse>(
      `${apiRoot}/commits/${encodeURIComponent(ref)}`,
    );
    const tree = await githubJson<TreeResponse>(
      `${apiRoot}/git/trees/${commit.commit.tree.sha}?recursive=1`,
    );

    if (tree.truncated) {
      throw new Error(
        'This repository is too large for the GitHub recursive tree endpoint.',
      );
    }

    const files = tree.tree
      .filter((entry) => entry.type === 'blob')
      .map((entry) => ({
        path: entry.path,
        size: entry.size ?? 0,
        sha: entry.sha,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));

    this.fileIndex = new Map(files.map((file) => [file.path, file]));
    this.snapshot = {
      repository,
      ref,
      commitSha: commit.sha,
      files,
    };

    return this.snapshot;
  }

  private requireSnapshot(): ProjectSnapshot {
    if (!this.snapshot) {
      throw new Error('Open the repository before reading files.');
    }
    return this.snapshot;
  }

  async read(path: string): Promise<Uint8Array> {
    const snapshot = this.requireSnapshot();
    if (!this.fileIndex.has(path)) {
      throw new Error(`File not found in project: ${path}`);
    }

    const url =
      `https://raw.githubusercontent.com/${snapshot.repository}/` +
      `${snapshot.commitSha}/${encodedPath(path)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to read ${path} from GitHub.`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async readText(path: string): Promise<string> {
    return decoder.decode(await this.read(path));
  }

  async readMany(paths: readonly string[]): Promise<Map<string, Uint8Array>> {
    const entries = await Promise.all(
      paths.map(async (path) => [path, await this.read(path)] as const),
    );
    return new Map(entries);
  }

  list(prefix = ''): FileMeta[] {
    const normalized = prefix.replace(/^\/+|\/+$/g, '');
    if (!normalized) {
      return [...this.fileIndex.values()];
    }
    const withSlash = `${normalized}/`;
    return [...this.fileIndex.values()].filter(
      (file) => file.path === normalized || file.path.startsWith(withSlash),
    );
  }

  stat(path: string): FileMeta | null {
    return this.fileIndex.get(path) ?? null;
  }
}
