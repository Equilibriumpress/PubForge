export type LayoutAuditSeverity = 'warning' | 'info';

export interface LayoutAuditIssue {
  page: number;
  severity: LayoutAuditSeverity;
  code:
    | 'sparse-page'
    | 'dense-page'
    | 'heading-low'
    | 'clipped-content'
    | 'small-editorial-image'
    | 'spread-imbalance';
  message: string;
}

export interface LayoutPageMetric {
  page: number;
  textCharacters: number;
  imageCount: number;
  imageAreaRatio: number;
  sourcePaths: string[];
}

export interface LayoutAuditReport {
  pages: LayoutPageMetric[];
  issues: LayoutAuditIssue[];
}

function ratio(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

function rectArea(rect: DOMRect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function isMeaningfullyClipped(rect: DOMRect, pageRect: DOMRect): boolean {
  const tolerance = 2;
  return (
    rect.left < pageRect.left - tolerance ||
    rect.right > pageRect.right + tolerance ||
    rect.top < pageRect.top - tolerance ||
    rect.bottom > pageRect.bottom + tolerance
  );
}

export function runLayoutAudit(root: HTMLElement): LayoutAuditReport {
  const pageElements = Array.from(
    root.querySelectorAll<HTMLElement>(
      '[data-vivliostyle-page-container="true"]',
    ),
  );

  const pages: LayoutPageMetric[] = [];
  const issues: LayoutAuditIssue[] = [];

  pageElements.forEach((pageElement, index) => {
    const page = index + 1;
    const pageRect = pageElement.getBoundingClientRect();
    const pageArea = Math.max(1, rectArea(pageRect));
    const textCharacters = (pageElement.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim().length;

    const images = Array.from(pageElement.querySelectorAll<HTMLElement>('img, svg'));
    const imageArea = images.reduce(
      (sum, image) => sum + rectArea(image.getBoundingClientRect()),
      0,
    );
    const imageAreaRatio = Math.min(1, ratio(imageArea, pageArea));

    const sourcePaths = Array.from(
      new Set(
        Array.from(
          pageElement.querySelectorAll<HTMLElement>('[data-source]'),
        )
          .map((element) => element.dataset.source)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    pages.push({
      page,
      textCharacters,
      imageCount: images.length,
      imageAreaRatio,
      sourcePaths,
    });

    if (textCharacters < 70 && imageAreaRatio < 0.18) {
      issues.push({
        page,
        severity: 'warning',
        code: 'sparse-page',
        message:
          'This page is unusually sparse. Check whether a forced break or oversized margin is creating avoidable white space.',
      });
    }

    if (textCharacters > 2500 && imageAreaRatio < 0.08) {
      issues.push({
        page,
        severity: 'warning',
        code: 'dense-page',
        message:
          'This page is text-dense. Consider shortening, opening the measure, or adding a visual interruption.',
      });
    }

    for (const heading of Array.from(
      pageElement.querySelectorAll<HTMLElement>('h1, h2, h3'),
    )) {
      const rect = heading.getBoundingClientRect();
      const verticalPosition = ratio(rect.top - pageRect.top, pageRect.height);
      if (verticalPosition > 0.82) {
        issues.push({
          page,
          severity: 'warning',
          code: 'heading-low',
          message:
            'A heading begins very low on the page. Consider keeping it with more following content or forcing the section to the next page.',
        });
        break;
      }
    }

    const riskyElements = Array.from(
      pageElement.querySelectorAll<HTMLElement>(
        'figure, table, pre, .pubforge-component, [data-editorial-image]',
      ),
    );
    if (
      riskyElements.some((element) =>
        isMeaningfullyClipped(element.getBoundingClientRect(), pageRect),
      )
    ) {
      issues.push({
        page,
        severity: 'warning',
        code: 'clipped-content',
        message:
          'A figure, table, code block or editorial component extends outside the rendered page bounds.',
      });
    }

    for (const figure of Array.from(
      pageElement.querySelectorAll<HTMLElement>('[data-editorial-image]'),
    )) {
      const figureRatio = ratio(rectArea(figure.getBoundingClientRect()), pageArea);
      if (figureRatio > 0 && figureRatio < 0.06) {
        issues.push({
          page,
          severity: 'info',
          code: 'small-editorial-image',
          message:
            'An editorial image occupies less than 6% of the page. Check whether it adds enough visual value at this size.',
        });
        break;
      }
    }
  });

  for (let index = 1; index < pages.length; index += 2) {
    const left = pages[index];
    const right = pages[index + 1];
    if (!right) break;

    const leftWeight = left.textCharacters + left.imageAreaRatio * 1800;
    const rightWeight = right.textCharacters + right.imageAreaRatio * 1800;
    const light = Math.max(1, Math.min(leftWeight, rightWeight));
    const heavy = Math.max(leftWeight, rightWeight);

    if (heavy / light > 3.4) {
      issues.push({
        page: left.page,
        severity: 'info',
        code: 'spread-imbalance',
        message:
          'This facing-page pair has a strong visual-density imbalance. It may be intentional, but review the spread as a whole.',
      });
    }
  }

  return { pages, issues };
}
