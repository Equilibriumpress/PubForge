# PubForge project format

A PubForge project is an ordinary Git repository. Git remains the source of truth; PubForge only reads a committed snapshot and renders publication output.

## Required structure

```text
publication.yml
content/
assets/
data/
theme/
```

Only `publication.yml` is mandatory at the repository root. Content and theme paths are declared in the manifest.

## Manifest v2

```yaml
version: 2

publication:
  title: Example book
  subtitle: A rich publication
  authors:
    - Example Author
  language: en
  type: book
  identifier: urn:isbn:9780000000000
  publisher: Example Press
  description: Example PubForge publication.
  subjects:
    - publishing
  rights: Copyright Example Author
  date: 2026-10-04

cover:
  image: assets/cover.jpg
  alt: Cover of Example book

contents:
  toc: true
  landmarks: true
  pageList: false

readingOrder:
  - path: content/01-preface.md
    role: preface
    title: Preface
  - path: content/02-chapter.md
    role: chapter
    title: Chapter One
    breakBefore: recto

theme:
  preset: book
  css: theme/publication.css

vfm:
  math: true
  mathRenderer: mathml
  footnote: dpub
  rewriteRelativeHrefExtensions: true

pdf:
  enabled: true
  profile: book
  size: A5
  binding: left
  bleed: 0mm
  cropMarks: false
  bookmarks: true

epub:
  enabled: true
  reflowable: true
  embeddedFonts: true

webpub:
  enabled: true

projectZip:
  enabled: true
```

The JSON Schema is stored in `schemas/publication.schema.json`.

## Publication metadata

The `publication` block contains distribution metadata rather than UI state. It is used by EPUB metadata, Web Publication manifests and output summaries.

## Reading order

`readingOrder` is the canonical sequence of publication documents. Entries can carry semantic roles, page-break behavior and an optional entry-specific theme.

## VFM

The `vfm` block controls Vivliostyle Flavored Markdown conversion. PubForge supports MathML/MathJax math, DPUB/Pandoc/GCPM footnotes, figure behavior and relative document-link rewriting.

## Output profiles

`pdf`, `epub` and `webpub` describe output intent. They are not generated artifacts and remain readable/editable source configuration.

## Design rule

PubForge stores no hidden publication state. A compatible project remains understandable with ordinary Git tools, text editors and standards-based publication tooling.


## Vivliostyle parity controls

Manifest v2 also exposes renderer controls that map to current Vivliostyle configuration concepts:

- `publication.readingProgression`: `ltr` or `rtl`
- `contents.tocTitle` and `contents.sectionDepth`: generated navigation labeling and heading depth
- `contents.pageList`: emits an EPUB page-list when source contains semantic `role="doc-pagebreak"` or `epub:type="pagebreak"` markers
- `readingOrder[].pageCounterReset`: resets the paged-media page counter for an entry
- `vfm.tableCell`: VFM table alignment output mode
- `assets.includes` / `assets.excludes`: explicit publication resource-copy rules in addition to dependency discovery
- `pdf.cropOffset`: production crop-offset intent. Browser print cannot guarantee printer-mark offset positioning; the production pipeline consumes this value.

PDF bookmark requests are retained as production intent because browser Save as PDF does not guarantee PDF outline generation.


## Theme packages

`theme.packages` and `epub.themePackages` may contain npm package references such as `@vivliostyle/theme-base@3.0.0`.

PubForge resolves these packages directly in the browser through jsDelivr, reads the package's Vivliostyle/style/main entry, recursively inlines CSS imports, downloads relative theme assets into a read-only virtual workspace and then bundles those resources into EPUB/WebPub output. Local project CSS is layered after base package themes so a publication can override package defaults.


## Rich browser assets

The optional `assets` controls can prepare derived resources without changing Git source:

- `mermaid: true`: fenced Mermaid blocks are rendered to virtual SVG files in the browser.
- `syntaxHighlighting: true`: fenced code blocks are highlighted with Shiki; `shikiTheme` selects the theme.
- `imageOptimization.maxDimension`: raster Markdown images larger than this are downsampled in-browser; JPEG quality is controlled with `jpegQuality`.

Derived files live under `.pubforge/generated/` only in the renderer workspace. The Project ZIP continues to contain the exact committed Git source.

`pdf.editions` may request `normal`, `print` and/or `high-quality` theme variants. These are CSS/rendering edition hooks; the browser does not claim vendor-specific image recompression or PDF/X behavior.


## Press-ready production

`pdf.production` controls the optional external print pipeline:

- `enabled`: opt in to production rendering
- `preflight`: `press-ready` or `press-ready-local`
- `preflightOptions`: options such as `enforce-outline` or `gray-scale`
- `cmyk`: enable Vivliostyle CLI CMYK post-processing
- `outputIntent`: project-relative ICC profile path

These settings are intentionally not executed by GitHub Pages. See `docs/press-ready.md`.


## Editorial images

For image-led publications, define reusable editorial images under `assets.editorialImages` and reference them in Markdown with `{{image:key}}`.

```yaml
assets:
  imagePreflight:
    targetDpi: 300
  editorialImages:
    opening-photo:
      src: assets/opening.jpg
      alt: Dawn over the Atlantic coast
      caption: First light on the western shore
      credit: Example Photographer
      fit: cover
      focalPoint: 62% 40%
      bleed: full
      span: spread
      position: full-page
      printWidthMm: 296
```

Supported image intent includes crop mode, focal point, full/page/spread placement, caption, credit, decorative images and explicit print width. Raster images receive an effective-DPI preflight when their pixel dimensions and print width can be resolved. Vector SVG artwork is treated as resolution independent.
