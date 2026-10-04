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

interface GitCommitResponse {
  sha: string;
  tree: {
    sha: string;
  };
}

interface GitRefResponse {
  object: {
    sha: string;
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

interface BlobResponse {
  sha: string;
}

interface CreateTreeResponse {
  sha: string;
}

interface CreateCommitResponse {
  sha: string;
}

interface HistoryCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
    committer: { name: string; date: string } | null;
  };
  author?: { login: string } | null;
}

export interface GitHubHistoryEntry {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface CommitChangesOptions {
  token: string;
  message: string;
  writes: Array<{ path: string; data: Uint8Array }>;
  deletes: string[];
}

const decoder = new TextDecoder();

function encodedPath(path: string): string {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function encodedRefPath(ref: string): string {
  return ref.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function bytesToBase64(data: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < data.length; index += chunkSize) {
    binary += String.fromCharCode(...data.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function githubRequest<T>(
  url: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    const rateRemaining = response.headers.get('x-ratelimit-remaining');
    if (response.status === 403 && rateRemaining === '0') {
      throw new Error('GitHub API rate limit reached.');
    }
    if (response.status === 401) {
      throw new Error('GitHub rejected the token.');
    }
    if (response.status === 403) {
      throw new Error('GitHub token does not have permission to write this repository.');
    }
    if (response.status === 404) {
      throw new Error('Repository, branch or file was not found.');
    }
    if (response.status === 422) {
      throw new Error('GitHub rejected the write because the branch changed or the request is invalid.');
    }
    throw new Error(`GitHub request failed with status ${response.status}.`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export class GitHubStorageProvider implements StorageProvider {
  private snapshot: ProjectSnapshot | null = null;
  private fileIndex = new Map<string, FileMeta>();

  constructor(private readonly target: RepositoryTarget) {}

  async open(): Promise<ProjectSnapshot> {
    const repository = `${this.target.owner}/${this.target.repo}`;
    const apiRoot = `https://api.github.com/repos/${repository}`;

    const repositoryInfo = await githubRequest<RepositoryResponse>(apiRoot);
    const ref = this.target.ref ?? repositoryInfo.default_branch;
    const commit = await githubRequest<CommitResponse>(
      `${apiRoot}/commits/${encodeURIComponent(ref)}`,
    );
    const tree = await githubRequest<TreeResponse>(
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
    if (!normalized) return [...this.fileIndex.values()];
    const withSlash = `${normalized}/`;
    return [...this.fileIndex.values()].filter(
      (file) => file.path === normalized || file.path.startsWith(withSlash),
    );
  }

  stat(path: string): FileMeta | null {
    return this.fileIndex.get(path) ?? null;
  }

  async listHistory(limit = 30): Promise<GitHubHistoryEntry[]> {
    const snapshot = this.requireSnapshot();
    const apiRoot = `https://api.github.com/repos/${snapshot.repository}`;
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const commits = await githubRequest<HistoryCommitResponse[]>(
      `${apiRoot}/commits?sha=${encodeURIComponent(snapshot.ref)}&per_page=${safeLimit}`,
    );

    return commits.map((entry) => {
      const firstLine = entry.commit.message.split('\n')[0].trim();
      return {
        sha: entry.sha,
        message: firstLine || 'Untitled commit',
        author:
          entry.author?.login ??
          entry.commit.author?.name ??
          entry.commit.committer?.name ??
          'Unknown',
        date:
          entry.commit.author?.date ??
          entry.commit.committer?.date ??
          new Date(0).toISOString(),
      };
    });
  }

  async commitChanges(options: CommitChangesOptions): Promise<string> {
    const snapshot = this.requireSnapshot();
    if (!options.token) throw new Error('A GitHub token is required.');
    if (!options.writes.length && !options.deletes.length) {
      throw new Error('There are no local changes to commit.');
    }

    const apiRoot = `https://api.github.com/repos/${snapshot.repository}`;
    const refPath = encodedRefPath(snapshot.ref);

    let ref: GitRefResponse;
    try {
      ref = await githubRequest<GitRefResponse>(
        `${apiRoot}/git/ref/heads/${refPath}`,
        {},
        options.token,
      );
    } catch {
      throw new Error('Write-back requires a branch ref. Open a branch instead of a tag or commit SHA.');
    }

    if (ref.object.sha !== snapshot.commitSha) {
      throw new Error(
        'The remote branch changed after this workspace was opened. Reload before committing.',
      );
    }

    const currentCommit = await githubRequest<GitCommitResponse>(
      `${apiRoot}/git/commits/${snapshot.commitSha}`,
      {},
      options.token,
    );

    const tree: Array<Record<string, unknown>> = [];

    for (const write of options.writes) {
      const blob = await githubRequest<BlobResponse>(
        `${apiRoot}/git/blobs`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: bytesToBase64(write.data),
            encoding: 'base64',
          }),
        },
        options.token,
      );
      tree.push({
        path: write.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    }

    for (const path of options.deletes) {
      tree.push({
        path,
        mode: '100644',
        type: 'blob',
        sha: null,
      });
    }

    const newTree = await githubRequest<CreateTreeResponse>(
      `${apiRoot}/git/trees`,
      {
        method: 'POST',
        body: JSON.stringify({
          base_tree: currentCommit.tree.sha,
          tree,
        }),
      },
      options.token,
    );

    const newCommit = await githubRequest<CreateCommitResponse>(
      `${apiRoot}/git/commits`,
      {
        method: 'POST',
        body: JSON.stringify({
          message: options.message,
          tree: newTree.sha,
          parents: [snapshot.commitSha],
        }),
      },
      options.token,
    );

    await githubRequest(
      `${apiRoot}/git/refs/heads/${refPath}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          sha: newCommit.sha,
          force: false,
        }),
      },
      options.token,
    );

    return newCommit.sha;
  }
}
