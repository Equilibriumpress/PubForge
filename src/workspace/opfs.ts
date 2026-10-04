function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function asArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

async function childDirectory(
  root: FileSystemDirectoryHandle,
  parts: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

export class OpfsProjectCache {
  private constructor(private readonly root: FileSystemDirectoryHandle) {}

  static async open(repository: string, commitSha: string): Promise<OpfsProjectCache | null> {
    if (!('storage' in navigator) || !navigator.storage.getDirectory) {
      return null;
    }

    try {
      const root = await navigator.storage.getDirectory();
      const pubforge = await root.getDirectoryHandle('pubforge', { create: true });
      const repo = await pubforge.getDirectoryHandle(safeSegment(repository), { create: true });
      const commit = await repo.getDirectoryHandle(commitSha, { create: true });
      return new OpfsProjectCache(commit);
    } catch {
      return null;
    }
  }

  async read(path: string): Promise<Uint8Array | null> {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return null;

    try {
      const directory = await childDirectory(this.root, parts, false);
      const handle = await directory.getFileHandle(fileName);
      const file = await handle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return null;
    }
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return;

    const directory = await childDirectory(this.root, parts, true);
    const handle = await directory.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(asArrayBuffer(data));
    await writable.close();
  }
}
