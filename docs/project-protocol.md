# PubForge project protocol

A compatible project is a Git repository with a version 2 `publication.yml` at its root.

## Stable contract

The v2 contract contains:

- publication/distribution metadata
- semantic `readingOrder`
- one base publication stylesheet plus optional entry/EPUB themes
- VFM settings for math, footnotes, figures and relative links
- optional cover metadata
- PDF, EPUB and Web Publication output profiles
- optional project assets and data

The JSON Schema lives at `schemas/publication.schema.json`.

## Directory convention

```text
publication.yml
content/
assets/
data/
theme/
AGENTS.md
```

Only `publication.yml` is mandatory. The other names are conventions, not hard requirements.

## Rendering contract

PubForge reads a pinned Git commit into an immutable browser workspace.

```text
Git commit
  ↓
VFM + publication compiler
  ↓
Vivliostyle preview
  ├─ PDF print view
  ├─ EPUB 3
  └─ Web Publication
```

Preview and outputs share the same reading order, metadata, VFM settings and assets.

## Preflight

Preflight checks source references and the generated EPUB package. A zero-error preflight means the browser pipeline is internally consistent; it does not mean a press PDF has been converted to PDF/X or passed an ICC/color-output-intent workflow.

## Portability

A PubForge project should remain useful without PubForge. A text editor, Git client and standards-based renderer should still be able to inspect the source.
