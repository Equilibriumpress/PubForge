export type PublicationType =
  | 'report'
  | 'book'
  | 'magazine'
  | 'manual'
  | 'travel-guide'
  | 'custom';

export type PublicationOutput = 'print' | 'epub' | 'webpub' | 'project-zip';

export type ContentEntry =
  | string
  | {
      path: string;
      title?: string;
      breakBefore?: 'auto' | 'page' | 'left' | 'right' | 'recto' | 'verso';
    };

export interface PublicationManifest {
  version: 1;
  title: string;
  subtitle?: string;
  author?: string | string[];
  language: string;
  type?: PublicationType;
  content: ContentEntry[];
  theme: {
    preset?: string;
    css: string;
  };
  outputs: PublicationOutput[];
}

export function contentPath(entry: ContentEntry): string {
  return typeof entry === 'string' ? entry : entry.path;
}
