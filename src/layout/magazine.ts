const COMPONENTS = new Set([
  'hero',
  'columns',
  'pullquote',
  'sidebar',
  'gallery',
  'fullpage',
  'opener',
  'spread',
]);

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(/([A-Za-z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g)) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function encodedMarker(name: string, attrs: Record<string, string>): string {
  return `<!--pubforge-component:${name}:${encodeURIComponent(JSON.stringify(attrs))}-->`;
}

export function encodeMagazineDirectives(markdown: string): string {
  const stack: string[] = [];
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];

  for (const line of lines) {
    const open = line.match(/^:::(\w[\w-]*)(?:\{([^}]*)\})?\s*$/);
    if (open && COMPONENTS.has(open[1])) {
      const name = open[1];
      stack.push(name);
      output.push(encodedMarker(name, parseAttributes(open[2] ?? '')));
      continue;
    }

    if (/^:::\s*$/.test(line) && stack.length) {
      stack.pop();
      output.push('<!--pubforge-component:end-->');
      continue;
    }

    output.push(line);
  }

  while (stack.length) {
    stack.pop();
    output.push('<!--pubforge-component:end-->');
  }

  return output.join('\n');
}

function attrsToHtml(name: string, attrs: Record<string, string>): string {
  const classes = ['pubforge-component', `pubforge-${name}`];
  if (attrs.layout) classes.push(`pubforge-layout-${attrs.layout}`);
  if (attrs.bleed) classes.push(`pubforge-bleed-${attrs.bleed}`);
  if (attrs.align) classes.push(`pubforge-align-${attrs.align}`);

  const style: string[] = [];
  if (attrs.count) style.push(`--pubforge-columns:${Number(attrs.count) || 2}`);
  if (attrs.gutter) style.push(`--pubforge-column-gap:${attrs.gutter}`);
  if (attrs.minHeight) style.push(`--pubforge-min-height:${attrs.minHeight}`);

  const data = Object.entries(attrs)
    .filter(([key]) => !['layout', 'bleed', 'align', 'count', 'gutter', 'minHeight'].includes(key))
    .map(([key, value]) => ` data-${key}="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`)
    .join('');

  return `<section class="${classes.join(' ')}"${style.length ? ` style="${style.join(';')}"` : ''}${data}>`;
}

export function decodeMagazineDirectives(html: string): string {
  return html
    .replace(
      /<!--pubforge-component:([A-Za-z0-9_-]+):([^]*?)-->/g,
      (_full, name: string, encoded: string) => {
        try {
          const attrs = JSON.parse(decodeURIComponent(encoded)) as Record<string, string>;
          return attrsToHtml(name, attrs);
        } catch {
          return attrsToHtml(name, {});
        }
      },
    )
    .replace(/<!--pubforge-component:end-->/g, '</section>');
}

export const MAGAZINE_BASE_CSS = `
:root {
  --pubforge-columns: 2;
  --pubforge-column-gap: 5mm;
}

.pubforge-component {
  box-sizing: border-box;
  position: relative;
  margin: 1.5em 0;
}

.pubforge-columns {
  column-count: var(--pubforge-columns, 2);
  column-gap: var(--pubforge-column-gap, 5mm);
  column-fill: auto;
}

.pubforge-pullquote {
  break-inside: avoid;
  margin-block: 2em;
  padding-block: .75em;
  border-block: 1px solid currentColor;
  font-size: 1.75em;
  line-height: 1.15;
  font-weight: 700;
}

.pubforge-sidebar {
  break-inside: avoid;
  padding: 1em;
  background: color-mix(in srgb, currentColor 6%, transparent);
}

.pubforge-hero,
.pubforge-opener,
.pubforge-fullpage {
  break-before: page;
  break-after: page;
  min-height: var(--pubforge-min-height, 85vh);
  display: grid;
  align-content: end;
  overflow: hidden;
}

.pubforge-hero > .pubforge-editorial-image,
.pubforge-opener > .pubforge-editorial-image,
.pubforge-fullpage > .pubforge-editorial-image {
  position: absolute;
  inset: 0;
  margin: 0;
  z-index: 0;
}

.pubforge-hero > .pubforge-editorial-image img,
.pubforge-opener > .pubforge-editorial-image img,
.pubforge-fullpage > .pubforge-editorial-image img {
  width: 100%;
  height: 100%;
}

.pubforge-hero > :not(.pubforge-editorial-image),
.pubforge-opener > :not(.pubforge-editorial-image),
.pubforge-fullpage > :not(.pubforge-editorial-image) {
  position: relative;
  z-index: 1;
}

.pubforge-gallery {
  display: grid;
  grid-template-columns: repeat(var(--pubforge-columns, 2), minmax(0, 1fr));
  gap: var(--pubforge-column-gap, 4mm);
  break-inside: avoid;
}

.pubforge-gallery .pubforge-editorial-image {
  margin: 0;
}

.pubforge-layout-mosaic .pubforge-editorial-image:first-child {
  grid-column: span 2;
  grid-row: span 2;
}

.pubforge-spread {
  break-before: left;
  break-after: right;
  min-height: var(--pubforge-min-height, 85vh);
}

.pubforge-bleed-full {
  margin-inline: calc(-1 * var(--pubforge-page-bleed-inline, 0mm));
}

@media screen and (max-width: 720px) {
  .pubforge-columns {
    column-count: 1;
  }
  .pubforge-gallery {
    grid-template-columns: 1fr;
  }
  .pubforge-layout-mosaic .pubforge-editorial-image:first-child {
    grid-column: auto;
    grid-row: auto;
  }
}
`;
