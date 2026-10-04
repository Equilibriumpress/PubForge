export interface PublicationTemplate {
  id: string;
  name: string;
  description: string;
  files: string[];
}

const FILES = [
  'publication.yml',
  'content/01-start.md',
  'content/02-main.md',
  'theme/publication.css',
];

export const PUBLICATION_TEMPLATES: PublicationTemplate[] = [
  {
    id: 'report',
    name: 'Report',
    description: 'A4 research, policy and annual reports with restrained print typography.',
    files: FILES,
  },
  {
    id: 'book',
    name: 'Book',
    description: 'A5 manuscript layout with recto chapter starts and book margins.',
    files: FILES,
  },
  {
    id: 'magazine',
    name: 'Magazine',
    description: 'Image-led A4 editorial layout with larger headings and compact body copy.',
    files: FILES,
  },
  {
    id: 'manual',
    name: 'Manual',
    description: 'Structured procedures, documentation and technical instructions.',
    files: FILES,
  },
  {
    id: 'travel-guide',
    name: 'Travel guide',
    description: 'Compact destination guide layout for places, routes and practical information.',
    files: FILES,
  },
];
