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
