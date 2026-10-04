export interface FileMeta {
  path: string;
  size: number;
  sha: string;
}

export interface ProjectSnapshot {
  repository: string;
  ref: string;
  commitSha: string;
  files: FileMeta[];
}

export interface StorageProvider {
  open(): Promise<ProjectSnapshot>;
  read(path: string): Promise<Uint8Array>;
  readText(path: string): Promise<string>;
  readMany(paths: readonly string[]): Promise<Map<string, Uint8Array>>;
  list(prefix?: string): FileMeta[];
  stat(path: string): FileMeta | null;
}
