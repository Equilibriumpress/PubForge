import { strToU8, zipSync, type Zippable } from 'fflate';

export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'publication';
}

export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  type = 'application/octet-stream',
): void {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadText(
  text: string,
  filename: string,
  type = 'text/plain;charset=utf-8',
): void {
  downloadBytes(new TextEncoder().encode(text), filename, type);
}

function shouldStore(path: string): boolean {
  return /\.(?:avif|epub|gif|gz|jpe?g|mp3|mp4|pdf|png|webp|woff2?|zip)$/i.test(path);
}

export function zipFiles(
  entries: Iterable<[string, Uint8Array]>,
  extra: Record<string, string | Uint8Array> = {},
): Uint8Array {
  const files: Zippable = {};

  for (const [path, bytes] of entries) {
    files[path] = [bytes, { level: shouldStore(path) ? 0 : 6 }];
  }
  for (const [path, value] of Object.entries(extra)) {
    const bytes = typeof value === 'string' ? strToU8(value) : value;
    files[path] = [bytes, { level: shouldStore(path) ? 0 : 6 }];
  }

  return zipSync(files, { level: 6 });
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function mediaType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const types: Record<string, string> = {
    css: 'text/css',
    gif: 'image/gif',
    html: 'text/html',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    json: 'application/json',
    md: 'text/markdown',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    png: 'image/png',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
    xhtml: 'application/xhtml+xml',
    xml: 'application/xml',
    yml: 'application/yaml',
    yaml: 'application/yaml',
  };
  return types[ext] ?? 'application/octet-stream';
}
