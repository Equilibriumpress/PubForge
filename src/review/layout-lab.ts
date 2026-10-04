import type { PublicationManifest } from '../types/publication';

export type LabPageSize = 'keep' | 'A5' | 'A4' | '6x9';
export type LabMargins = 'keep' | 'compact' | 'standard' | 'airy';
export type LabColumns = 'keep' | 1 | 2 | 3;
export type LabImageScale = 'keep' | 'restrained' | 'emphasis';

export interface LayoutLabSettings {
  pageSize: LabPageSize;
  margins: LabMargins;
  columns: LabColumns;
  fontScale: number;
  imageScale: LabImageScale;
}

export const DEFAULT_LAYOUT_LAB: LayoutLabSettings = {
  pageSize: 'keep',
  margins: 'keep',
  columns: 'keep',
  fontScale: 100,
  imageScale: 'keep',
};

const PAGE_SIZE_CSS: Record<Exclude<LabPageSize, 'keep'>, string> = {
  A5: 'A5',
  A4: 'A4',
  '6x9': '6in 9in',
};

const MARGIN_CSS: Record<Exclude<LabMargins, 'keep'>, string> = {
  compact: '12mm 11mm 14mm',
  standard: '18mm 17mm 20mm',
  airy: '24mm 22mm 26mm',
};

function pageNames(manifest: PublicationManifest): string[] {
  return Array.from(
    new Set(
      manifest.readingOrder
        .map((entry) => entry.pageName)
        .filter((name): name is string => Boolean(name)),
    ),
  );
}

function pageRule(selector: string, settings: LayoutLabSettings): string {
  const declarations: string[] = [];
  if (settings.pageSize !== 'keep') {
    declarations.push('size: ' + PAGE_SIZE_CSS[settings.pageSize]);
  }
  if (settings.margins !== 'keep') {
    declarations.push('margin: ' + MARGIN_CSS[settings.margins]);
  }
  return declarations.length
    ? '@page ' + selector + ' { ' + declarations.join('; ') + '; }'
    : '';
}

export function buildLayoutLabCss(
  manifest: PublicationManifest,
  settings: LayoutLabSettings,
): string {
  const css: string[] = [];

  const defaultRule = pageRule('', settings).replace('@page  {', '@page {');
  if (defaultRule) css.push(defaultRule);

  for (const name of pageNames(manifest)) {
    const rule = pageRule(name, settings);
    if (rule) css.push(rule);
  }

  if (settings.columns !== 'keep') {
    css.push(
      '.pubforge-columns { column-count: ' +
        settings.columns +
        ' !important; }',
    );
  }

  if (settings.fontScale !== 100) {
    css.push(
      'body { font-size: ' + settings.fontScale + '% !important; }',
    );
  }

  if (settings.imageScale === 'restrained') {
    css.push(
      '.pubforge-editorial-image:not(.pubforge-image-position-full-page) {' +
        ' width: 82% !important; margin-left: auto !important; margin-right: auto !important; }',
    );
  }

  if (settings.imageScale === 'emphasis') {
    css.push(
      '.pubforge-editorial-image:not(.pubforge-image-position-full-page) {' +
        ' width: 110% !important; max-width: 110% !important; margin-left: -5% !important; }',
    );
  }

  return css.join('\n');
}

export function layoutLabSummary(settings: LayoutLabSettings): string[] {
  const lines: string[] = [];
  if (settings.pageSize !== 'keep') lines.push('page size: ' + settings.pageSize);
  if (settings.margins !== 'keep') lines.push('margins: ' + settings.margins);
  if (settings.columns !== 'keep') lines.push('columns: ' + settings.columns);
  if (settings.fontScale !== 100) lines.push('body font scale: ' + settings.fontScale + '%');
  if (settings.imageScale !== 'keep') lines.push('image emphasis: ' + settings.imageScale);
  return lines;
}

export function layoutLabIsDefault(settings: LayoutLabSettings): boolean {
  return layoutLabSummary(settings).length === 0;
}
