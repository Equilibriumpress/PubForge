import { parse } from 'yaml';

import {
  enabledOutputs,
  type ContentEntry,
  type PublicationManifest,
  type PublicationMetadata,
} from '../types/publication';

interface RawManifest {
  version?: number;
  publication?: PublicationMetadata;
  cover?: PublicationManifest['cover'];
  contents?: PublicationManifest['contents'];
  readingOrder?: ContentEntry[];
  layout?: PublicationManifest['layout'];
  theme?: PublicationManifest['theme'];
  assets?: PublicationManifest['assets'];
  vfm?: PublicationManifest['vfm'];
  pdf?: PublicationManifest['pdf'];
  epub?: PublicationManifest['epub'];
  webpub?: PublicationManifest['webpub'];
  projectZip?: PublicationManifest['projectZip'];
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`publication.yml requires ${label}.`);
  }
  return value;
}

export function parsePublicationManifest(source: string): PublicationManifest {
  const value = parse(source) as RawManifest | null;

  if (!value || typeof value !== 'object') {
    throw new Error('publication.yml must contain a YAML object.');
  }
  if (value.version !== 2) {
    throw new Error('publication.yml must declare version: 2.');
  }
  if (!value.publication || typeof value.publication !== 'object') {
    throw new Error('publication.yml requires a publication metadata block.');
  }

  const publication: PublicationMetadata = {
    ...value.publication,
    title: requiredString(value.publication.title, 'publication.title'),
    language: requiredString(value.publication.language, 'publication.language'),
    readingProgression: value.publication.readingProgression ?? 'ltr',
  };

  if (!Array.isArray(value.readingOrder) || value.readingOrder.length === 0) {
    throw new Error('publication.yml requires at least one readingOrder entry.');
  }

  const readingOrder = value.readingOrder.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`readingOrder[${index}] must be an object with a path.`);
    }
    return {
      ...entry,
      path: requiredString(entry.path, `readingOrder[${index}].path`),
    };
  });

  if (!value.theme || typeof value.theme.css !== 'string' || !value.theme.css.trim()) {
    throw new Error('publication.yml requires theme.css.');
  }

  const sectionDepth = value.contents?.sectionDepth ?? 1;
  if (!Number.isInteger(sectionDepth) || sectionDepth < 1 || sectionDepth > 6) {
    throw new Error('contents.sectionDepth must be an integer from 1 through 6.');
  }

  const manifest = {
    version: 2,
    publication,
    cover: value.cover,
    contents: {
      toc: value.contents?.toc ?? true,
      tocTitle: value.contents?.tocTitle ?? 'Contents',
      sectionDepth,
      landmarks: value.contents?.landmarks ?? true,
      pageList: value.contents?.pageList ?? false,
    },
    readingOrder,
    layout: value.layout ?? { mode: 'flow' },
    theme: value.theme,
    assets: value.assets ?? {},
    vfm: value.vfm ?? {
      math: true,
      mathRenderer: 'mathml',
      footnote: 'dpub',
      rewriteRelativeHrefExtensions: true,
      tableCell: 'align-class',
    },
    pdf: value.pdf ?? {
      enabled: true,
      profile: 'screen',
      bookmarks: true,
    },
    epub: {
      enabled: value.epub?.enabled ?? true,
      layout:
        value.epub?.layout ??
        (value.epub?.reflowable === false ? 'fixed' : 'reflowable'),
      reflowable:
        (value.epub?.layout ??
          (value.epub?.reflowable === false ? 'fixed' : 'reflowable')) ===
        'reflowable',
      editions:
        value.epub?.editions ??
        [
          value.epub?.layout ??
            (value.epub?.reflowable === false ? 'fixed' : 'reflowable'),
        ],
      vendorProfile: value.epub?.vendorProfile ?? 'generic',
      viewport: value.epub?.viewport,
      orientation: value.epub?.orientation ?? 'auto',
      spread: value.epub?.spread ?? 'auto',
      theme: value.epub?.theme,
      themePackages: value.epub?.themePackages,
      embeddedFonts: value.epub?.embeddedFonts ?? true,
    },
    webpub: value.webpub ?? { enabled: true },
    projectZip: value.projectZip ?? { enabled: true },

    title: publication.title,
    subtitle: publication.subtitle,
    author:
      publication.authors && publication.authors.length === 1
        ? publication.authors[0]
        : publication.authors,
    language: publication.language,
    type: publication.type,
    content: readingOrder,
    outputs: [] as PublicationManifest['outputs'],
  } satisfies PublicationManifest;

  manifest.outputs = enabledOutputs(manifest);
  return manifest;
}
