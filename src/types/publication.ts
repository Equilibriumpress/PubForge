export type PublicationType =
  | 'report'
  | 'book'
  | 'magazine'
  | 'manual'
  | 'travel-guide'
  | 'custom';

export type ContentRole =
  | 'cover'
  | 'title-page'
  | 'copyright'
  | 'toc'
  | 'preface'
  | 'chapter'
  | 'appendix'
  | 'bibliography'
  | 'colophon'
  | 'other';

export type PublicationOutput = 'print' | 'epub' | 'webpub' | 'project-zip';

export interface EditorialImageSpec {
  src: string;
  alt?: string;
  caption?: string;
  credit?: string;
  decorative?: boolean;
  fit?: 'cover' | 'contain';
  focalPoint?: string;
  bleed?: 'none' | 'full' | 'left' | 'right';
  span?: 'column' | 'page' | 'spread';
  position?: 'inline' | 'float-left' | 'float-right' | 'full-page';
  printWidthMm?: number;
  targetDpi?: number;
}

export interface ContentEntry {
  path: string;
  title?: string;
  role?: ContentRole;
  theme?: string;
  breakBefore?: 'auto' | 'page' | 'left' | 'right' | 'recto' | 'verso';
  pageCounterReset?: number;
  layout?: 'flow' | 'page' | 'spread';
  pageName?: string;
}

export interface PublicationMetadata {
  title: string;
  subtitle?: string;
  authors?: string[];
  language: string;
  type?: PublicationType;
  identifier?: string;
  publisher?: string;
  description?: string;
  subjects?: string[];
  rights?: string;
  date?: string;
  readingProgression?: 'ltr' | 'rtl';
}

export interface PublicationManifest {
  version: 2;
  publication: PublicationMetadata;
  cover?: {
    image?: string;
    page?: string;
    alt?: string;
  };
  contents?: {
    toc?: boolean;
    tocTitle?: string;
    sectionDepth?: number;
    landmarks?: boolean;
    pageList?: boolean;
  };
  readingOrder: ContentEntry[];
  layout?: {
    mode?: 'flow' | 'magazine';
    columns?: number;
    gutter?: string;
  };
  theme: {
    preset?: string;
    css: string;
    packages?: string[];
  };
  assets?: {
    includes?: string[];
    excludes?: string[];
    mermaid?: boolean;
    syntaxHighlighting?: boolean;
    shikiTheme?: string;
    imageOptimization?: {
      maxDimension?: number;
      jpegQuality?: number;
    };
    editorialImages?: Record<string, EditorialImageSpec>;
    imagePreflight?: {
      targetDpi?: number;
    };
  };
  vfm?: {
    math?: boolean;
    mathRenderer?: 'mathjax' | 'mathml';
    footnote?: 'pandoc' | 'dpub' | 'gcpm';
    hardLineBreaks?: boolean;
    imgFigcaptionOrder?: 'img-figcaption' | 'figcaption-img';
    assignIdToFigcaption?: boolean;
    captionlessImagePolicy?: 'paragraph' | 'figure';
    parseFigcaptionAsInline?: boolean;
    rewriteRelativeHrefExtensions?: boolean;
    tableCell?: 'align-attribute' | 'align-class' | 'align-style';
  };
  pdf?: {
    enabled?: boolean;
    profile?: 'screen' | 'book' | 'press';
    size?: string;
    width?: string;
    height?: string;
    binding?: 'left' | 'right';
    bleed?: string;
    cropMarks?: boolean;
    cropOffset?: string;
    bookmarks?: boolean;
    editions?: Array<'normal' | 'print' | 'high-quality'>;
    production?: {
      enabled?: boolean;
      preflight?: 'press-ready' | 'press-ready-local';
      preflightOptions?: string[];
      cmyk?: boolean;
      outputIntent?: string;
    };
  };
  epub?: {
    enabled?: boolean;
    reflowable?: boolean;
    layout?: 'reflowable' | 'fixed';
    editions?: Array<'reflowable' | 'fixed'>;
    vendorProfile?: 'generic' | 'apple-books' | 'kindle' | 'kobo';
    viewport?: {
      width: number;
      height: number;
    };
    orientation?: 'auto' | 'portrait' | 'landscape';
    spread?: 'auto' | 'none' | 'landscape' | 'both';
    theme?: string;
    fixedTheme?: string;
    themePackages?: string[];
    embeddedFonts?: boolean;
  };
  webpub?: {
    enabled?: boolean;
  };
  projectZip?: {
    enabled?: boolean;
  };

  title: string;
  subtitle?: string;
  author?: string | string[];
  language: string;
  type?: PublicationType;
  content: ContentEntry[];
  outputs: PublicationOutput[];
}

export function contentPath(entry: ContentEntry): string {
  return entry.path;
}

export function enabledOutputs(manifest: PublicationManifest): PublicationOutput[] {
  const outputs: PublicationOutput[] = [];
  if (manifest.pdf?.enabled !== false) outputs.push('print');
  if (manifest.epub?.enabled !== false) outputs.push('epub');
  if (manifest.webpub?.enabled !== false) outputs.push('webpub');
  if (manifest.projectZip?.enabled !== false) outputs.push('project-zip');
  return outputs;
}
