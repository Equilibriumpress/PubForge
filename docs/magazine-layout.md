# Magazine layout

PubForge magazine projects use normal Markdown plus a small editorial component layer. ChatGPT can edit these files directly in Git without a visual CMS.

## Project intent

```yaml
publication:
  type: magazine

layout:
  mode: magazine
  columns: 3
  gutter: 5mm

readingOrder:
  - path: content/cover.md
    layout: page
    pageName: cover
  - path: content/feature.md
    layout: spread
    pageName: spread
```

`layout: page` and `layout: spread` describe art-directed entries. `pageName` maps the entry to a CSS named page.

## Components

Components use fenced editorial directives. Markdown inside them stays ordinary Markdown.

```md
:::hero{bleed="full" minHeight="250mm"}
{{image:opening-photo}}

<p class="kicker">TRAVEL</p>

# The Atlantic edge

A short deck can remain live text.
:::
```

Supported components:

- `hero`: full visual opener
- `opener`: section/chapter opener
- `columns`: multi-column editorial text; use `count` and `gutter`
- `pullquote`: emphasized quotation
- `sidebar`: boxed supporting information
- `gallery`: image grid; `layout="mosaic"` enlarges the first image
- `fullpage`: one-page art-directed block
- `spread`: two-page/wide composition

Example:

```md
:::columns{count="3" gutter="5mm"}
Long-form feature text...

:::pullquote
A strong quote can interrupt the text rhythm.
:::

More feature text.
:::
```

## Styling

PubForge ships only neutral base behavior. Publication art direction belongs in the project theme CSS. Named pages, grids, typography, color, image treatment and spread geometry therefore remain ordinary version-controlled CSS.

## EPUB

The same semantic content remains available to reflowable EPUB. A project can supply a separate `epub.theme` that collapses multi-column/spread presentation into a linear reading experience.

The fixed-layout EPUB pipeline can preserve the page/spread compositions instead; see the fixed-layout EPUB documentation.
