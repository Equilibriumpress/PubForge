import type { PublicationManifest } from '../types/publication';

const PAGE_SIZES: Record<string, string> = {
  A4: '210mm 297mm',
  A5: '148mm 210mm',
  A6: '105mm 148mm',
  Letter: '8.5in 11in',
  Legal: '8.5in 14in',
};

export type PdfEdition = 'normal' | 'print' | 'high-quality';

export interface PdfProfileSummary {
  profile: 'screen' | 'book' | 'press';
  pageSize: string;
  binding: 'left' | 'right';
  bleed: string;
  cropMarks: boolean;
  cropOffset: string;
  bookmarks: boolean;
  browserPdf: boolean;
  pdfX: boolean;
}

export function resolvePdfProfile(
  manifest: PublicationManifest,
): PdfProfileSummary {
  const pdf = manifest.pdf ?? {};
  const profile = pdf.profile ?? 'screen';
  const pageSize =
    pdf.width && pdf.height
      ? `${pdf.width} ${pdf.height}`
      : PAGE_SIZES[pdf.size ?? 'A4'] ?? pdf.size ?? PAGE_SIZES.A4;
  const bleed = pdf.bleed ?? (profile === 'press' ? '3mm' : '0mm');

  return {
    profile,
    pageSize,
    binding: pdf.binding ?? 'left',
    bleed,
    cropMarks: pdf.cropMarks ?? profile === 'press',
    cropOffset: pdf.cropOffset ?? 'auto',
    bookmarks: pdf.bookmarks ?? true,
    browserPdf: true,
    pdfX: false,
  };
}

export function buildPdfProfileCss(
  manifest: PublicationManifest,
  edition: PdfEdition = 'normal',
): string {
  const profile = resolvePdfProfile(manifest);
  const marks = profile.cropMarks ? 'crop' : 'none';
  const progression = manifest.publication.readingProgression ?? 'ltr';

  return `
@page {
  size: ${profile.pageSize};
  bleed: ${profile.bleed};
  marks: ${marks};
}

:root {
  --pubforge-pdf-profile: "${profile.profile}";
  --pubforge-binding: "${profile.binding}";
  --pubforge-crop-offset: "${profile.cropOffset}";
  --pubforge-pdf-edition: "${edition}";
  direction: ${progression};
}

.pubforge-cover {
  break-before: recto;
  break-after: page;
}

.pubforge-toc {
  break-before: recto;
  break-after: page;
}
`;
}
