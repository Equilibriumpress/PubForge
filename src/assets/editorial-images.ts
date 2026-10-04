import type { EditorialImageSpec, PublicationManifest } from '../types/publication';
import type { ProjectWorkspace } from '../workspace/workspace';

export interface EditorialImageMetric {
  key: string;
  path: string;
  width?: number;
  height?: number;
  printWidthMm?: number;
  effectiveDpi?: number;
  targetDpi: number;
  decorative: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageWidthMm(manifest: PublicationManifest): number | undefined {
  const standard: Record<string, number> = {
    A4: 210,
    A5: 148,
    A6: 105,
    Letter: 215.9,
    Legal: 215.9,
  };
  if (manifest.pdf?.width?.endsWith('mm')) {
    const value = Number.parseFloat(manifest.pdf.width);
    if (Number.isFinite(value)) return value;
  }
  return standard[manifest.pdf?.size ?? ''];
}

function inferredPrintWidthMm(
  manifest: PublicationManifest,
  spec: EditorialImageSpec,
): number | undefined {
  if (spec.printWidthMm) return spec.printWidthMm;
  const pageWidth = pageWidthMm(manifest);
  if (!pageWidth) return undefined;
  if (spec.span === 'spread') return pageWidth * 2;
  if (spec.span === 'page' || spec.position === 'full-page' || spec.bleed === 'full') {
    return pageWidth;
  }
  return undefined;
}

function svgDimensions(source: string): { width?: number; height?: number } {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = doc.documentElement;
  const width = Number.parseFloat(svg.getAttribute('width') ?? '');
  const height = Number.parseFloat(svg.getAttribute('height') ?? '');
  if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };

  const viewBox = svg.getAttribute('viewBox')?.trim().split(/\s+/).map(Number);
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
    return { width: viewBox[2], height: viewBox[3] };
  }
  return {};
}

function bytesAsArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

async function imageDimensions(
  workspace: ProjectWorkspace,
  path: string,
): Promise<{ width?: number; height?: number }> {
  if (/\.svg$/i.test(path)) {
    return svgDimensions(workspace.text(path));
  }

  if (
    /\.(?:png|jpe?g|webp)$/i.test(path) &&
    typeof createImageBitmap === 'function'
  ) {
    const bitmap = await createImageBitmap(
      new Blob([bytesAsArrayBuffer(workspace.read(path))]),
    );
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }
  return {};
}

function figureHtml(key: string, spec: EditorialImageSpec): string {
  const classes = [
    'pubforge-editorial-image',
    `pubforge-image-span-${spec.span ?? 'column'}`,
    `pubforge-image-bleed-${spec.bleed ?? 'none'}`,
    `pubforge-image-position-${spec.position ?? 'inline'}`,
    `pubforge-image-fit-${spec.fit ?? 'cover'}`,
  ].join(' ');
  const alt = spec.decorative ? '' : (spec.alt ?? '');
  const presentation = spec.decorative ? ' role="presentation" aria-hidden="true"' : '';
  const focal = escapeHtml(spec.focalPoint ?? '50% 50%');
  const caption = spec.caption
    ? `<span class="pubforge-image-caption">${escapeHtml(spec.caption)}</span>`
    : '';
  const credit = spec.credit
    ? `<span class="pubforge-image-credit">${escapeHtml(spec.credit)}</span>`
    : '';
  const figcaption = caption || credit
    ? `<figcaption>${caption}${credit}</figcaption>`
    : '';

  return `<figure class="${classes}" data-editorial-image="${escapeHtml(key)}" style="--pubforge-focal-point:${focal}"><img src="/${escapeHtml(spec.src)}" alt="${escapeHtml(alt)}"${presentation}/>${figcaption}</figure>`;
}

export function replaceEditorialImageTokens(
  markdown: string,
  manifest: PublicationManifest,
): string {
  const images = manifest.assets?.editorialImages ?? {};
  return markdown.replace(/\{\{image:([A-Za-z0-9._-]+)\}\}/g, (match, key: string) => {
    const spec = images[key];
    return spec ? figureHtml(key, spec) : match;
  });
}

export async function inspectEditorialImages(
  workspace: ProjectWorkspace,
  manifest: PublicationManifest,
): Promise<EditorialImageMetric[]> {
  const metrics: EditorialImageMetric[] = [];
  for (const [key, spec] of Object.entries(manifest.assets?.editorialImages ?? {})) {
    const targetDpi =
      spec.targetDpi ??
      manifest.assets?.imagePreflight?.targetDpi ??
      (manifest.pdf?.profile === 'press' ? 300 : 200);
    let width: number | undefined;
    let height: number | undefined;

    if (workspace.has(spec.src)) {
      const dimensions = await imageDimensions(workspace, spec.src);
      width = dimensions.width;
      height = dimensions.height;
    }

    const printWidthMm = inferredPrintWidthMm(manifest, spec);
    const effectiveDpi =
      width && printWidthMm
        ? width / (printWidthMm / 25.4)
        : undefined;

    metrics.push({
      key,
      path: spec.src,
      width,
      height,
      printWidthMm,
      effectiveDpi,
      targetDpi,
      decorative: spec.decorative ?? false,
    });
  }
  return metrics;
}

export const EDITORIAL_IMAGE_CSS = `
.pubforge-editorial-image {
  margin: 1.5em 0;
  break-inside: avoid;
}
.pubforge-editorial-image img {
  display: block;
  width: 100%;
  max-width: none;
  object-fit: cover;
  object-position: var(--pubforge-focal-point, 50% 50%);
}
.pubforge-image-fit-contain img { object-fit: contain; }
.pubforge-image-span-page { width: 100%; }
.pubforge-image-span-spread { width: 200%; max-width: 200%; }
.pubforge-image-position-float-left {
  float: left;
  width: min(48%, 70mm);
  margin: .2em 1.2em .8em 0;
}
.pubforge-image-position-float-right {
  float: right;
  width: min(48%, 70mm);
  margin: .2em 0 .8em 1.2em;
}
.pubforge-image-position-full-page {
  break-before: page;
  break-after: page;
  min-height: 90vh;
  display: grid;
  align-content: center;
}
.pubforge-image-bleed-full {
  margin-left: calc(-1 * var(--pubforge-page-bleed-inline, 0mm));
  margin-right: calc(-1 * var(--pubforge-page-bleed-inline, 0mm));
}
.pubforge-editorial-image figcaption {
  display: flex;
  justify-content: space-between;
  gap: 1em;
}
.pubforge-image-credit {
  white-space: nowrap;
  opacity: .72;
}
`;
