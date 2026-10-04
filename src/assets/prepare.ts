import type { PublicationManifest } from '../types/publication';
import type { ProjectWorkspace } from '../workspace/workspace';

export interface PreparedAssets {
  content: Map<string, string>;
  mermaidDiagrams: number;
  highlightedBlocks: number;
  optimizedImages: number;
}

async function replaceAsync(
  source: string,
  pattern: RegExp,
  replace: (match: RegExpExecArray) => Promise<string>,
): Promise<string> {
  const parts: string[] = [];
  let cursor = 0;
  pattern.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    parts.push(source.slice(cursor, match.index));
    parts.push(await replace(match));
    cursor = match.index + match[0].length;
  }
  parts.push(source.slice(cursor));
  return parts.join('');
}

function resolvedProjectPath(sourcePath: string, reference: string): string | null {
  if (
    !reference ||
    reference.startsWith('#') ||
    reference.startsWith('http:') ||
    reference.startsWith('https:') ||
    reference.startsWith('data:') ||
    reference.startsWith('//')
  ) {
    return null;
  }
  const url = new URL(reference, `https://pubforge.local/${sourcePath}`);
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

function imageMime(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

function safeStem(path: string): string {
  return path
    .replace(/^.*\//, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function rasterize(
  workspace: ProjectWorkspace,
  path: string,
  maxDimension: number,
  jpegQuality: number,
  index: number,
): Promise<string | null> {
  const mime = imageMime(path);
  if (!mime || typeof createImageBitmap !== 'function') return null;

  const bytes = workspace.read(path);
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }));
  try {
    const largest = Math.max(bitmap.width, bitmap.height);
    if (largest <= maxDimension) return null;

    const scale = maxDimension / largest;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    let blob: Blob;
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.drawImage(bitmap, 0, 0, width, height);
      blob = await canvas.convertToBlob({
        type: mime,
        quality: mime === 'image/jpeg' ? jpegQuality : undefined,
      });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.drawImage(bitmap, 0, 0, width, height);
      blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('Image encoding failed.'))),
          mime,
          mime === 'image/jpeg' ? jpegQuality : undefined,
        );
      });
    }

    const virtual = `.pubforge/generated/images/${String(index).padStart(3, '0')}-${safeStem(path)}`;
    workspace.addVirtual(virtual, new Uint8Array(await blob.arrayBuffer()));
    return `/${virtual}`;
  } finally {
    bitmap.close();
  }
}

export async function prepareRichAssets(
  workspace: ProjectWorkspace,
  manifest: PublicationManifest,
): Promise<PreparedAssets> {
  const prepared: PreparedAssets = {
    content: new Map(),
    mermaidDiagrams: 0,
    highlightedBlocks: 0,
    optimizedImages: 0,
  };

  const useMermaid = manifest.assets?.mermaid !== false;
  const useHighlighting = manifest.assets?.syntaxHighlighting !== false;
  const shikiTheme = manifest.assets?.shikiTheme ?? 'github-light';
  const imagePolicy = manifest.assets?.imageOptimization;

  const mermaidApi = useMermaid
    ? (await import('mermaid')).default
    : null;
  const shikiApi = useHighlighting
    ? await import('shiki')
    : null;

  if (mermaidApi) {
    mermaidApi.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default',
    });
  }

  let generatedIndex = 0;
  let imageIndex = 0;

  for (const entry of manifest.readingOrder) {
    const original = workspace.text(entry.path);
    let markdown = original;

    markdown = await replaceAsync(
      markdown,
      /`{3}([A-Za-z0-9_+.-]+)[^\n]*\n([\s\S]*?)`{3}/g,
      async (match) => {
        const language = match[1].toLowerCase();
        const code = match[2].replace(/\s+$/, '');

        if (language === 'mermaid' && mermaidApi) {
          const id = `pubforge-mermaid-${++generatedIndex}`;
          const rendered = await mermaidApi.render(id, code);
          const path = `.pubforge/generated/mermaid/${id}.svg`;
          workspace.addVirtual(path, new TextEncoder().encode(rendered.svg));
          prepared.mermaidDiagrams += 1;
          return `<figure class="pubforge-generated-mermaid"><img src="/${path}" alt="Generated Mermaid diagram" /></figure>`;
        }

        if (shikiApi && language && !['text', 'txt', 'plaintext'].includes(language)) {
          try {
            const html = await shikiApi.codeToHtml(code, {
              lang: language,
              theme: shikiTheme,
            });
            prepared.highlightedBlocks += 1;
            return `<div class="pubforge-highlighted-code">${html}</div>`;
          } catch {
            return match[0];
          }
        }

        return match[0];
      },
    );

    if (imagePolicy?.maxDimension) {
      markdown = await replaceAsync(
        markdown,
        /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
        async (match) => {
          const source = match[2];
          const path = resolvedProjectPath(entry.path, source);
          if (!path || !workspace.has(path) || !imageMime(path)) return match[0];
          try {
            const replacement = await rasterize(
              workspace,
              path,
              imagePolicy.maxDimension ?? 2400,
              imagePolicy.jpegQuality ?? 0.9,
              ++imageIndex,
            );
            if (!replacement) return match[0];
            prepared.optimizedImages += 1;
            return `![${match[1]}](${replacement})`;
          } catch {
            return match[0];
          }
        },
      );
    }

    if (markdown !== original) {
      prepared.content.set(entry.path, markdown);
    }
  }

  return prepared;
}