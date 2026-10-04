import type { StorageProvider, ProjectSnapshot } from '../storage/types';
import { OpfsProjectCache } from './opfs';

const MAX_PROJECT_BYTES = 100 * 1024 * 1024;
const CONCURRENCY = 6;

async function mapConcurrent<T>(
  items: readonly T[],
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

function cloneBytes(data: Uint8Array): Uint8Array {
  return new Uint8Array(data);
}

export class ProjectWorkspace {
  private readonly files = new Map<string, Uint8Array>();

  private constructor(
    readonly snapshot: ProjectSnapshot,
    private readonly cache: OpfsProjectCache | null,
  ) {}

  static async hydrate(
    provider: StorageProvider,
    snapshot: ProjectSnapshot,
    onProgress?: (done: number, total: number) => void,
  ): Promise<ProjectWorkspace> {
    const totalBytes = snapshot.files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_PROJECT_BYTES) {
      throw new Error('Project exceeds the 100 MB browser workspace limit.');
    }

    const cache = await OpfsProjectCache.open(snapshot.repository, snapshot.commitSha);
    const workspace = new ProjectWorkspace(snapshot, cache);
    let done = 0;

    await mapConcurrent(snapshot.files, async (file) => {
      let data = cache ? await cache.read(file.path) : null;
      if (!data) {
        data = await provider.read(file.path);
        if (cache) await cache.write(file.path, data);
      }
      workspace.files.set(file.path, cloneBytes(data));
      done += 1;
      onProgress?.(done, snapshot.files.length);
    });

    return workspace;
  }

  has(path: string): boolean {
    return this.files.has(path);
  }

  read(path: string): Uint8Array {
    const data = this.files.get(path);
    if (!data) throw new Error(`Workspace file not found: ${path}`);
    return data;
  }

  text(path: string): string {
    return new TextDecoder().decode(this.read(path));
  }

  list(prefix = ''): string[] {
    const normalized = prefix.replace(/^\/+|\/+$/g, '');
    const withSlash = normalized ? `${normalized}/` : '';
    return [...this.files.keys()]
      .filter((path) => !normalized || path === normalized || path.startsWith(withSlash))
      .sort();
  }

  entries(): Array<[string, Uint8Array]> {
    return [...this.files.entries()].sort(([a], [b]) => a.localeCompare(b));
  }
}
