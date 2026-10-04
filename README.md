# PubForge

Git-native high-fidelity publication rendering for PDF, EPUB 3 and Web Publications.

PubForge is intentionally **not a CMS**. ChatGPT performs editorial work in GitHub; PubForge reads a pinned Git commit and turns it into preview, preflight results and publication output.

## Workflow

```text
User
  ↓
ChatGPT edits publication source
  ↓
GitHub commit
  ↓
PubForge
  ├─ Preview
  ├─ Preflight
  └─ Output
       ├─ PDF
       ├─ EPUB 3
       ├─ Web Publication
       └─ source snapshot
```

GitHub is the source of truth. The PubForge browser app is read-only.

## Current feature set

- public GitHub repository loading by `owner/repo`, GitHub URL or `owner/repo@ref`
- immutable commit snapshots and OPFS-backed browser cache
- rich `publication.yml` v2 + JSON Schema
- semantic reading order and publication roles
- Vivliostyle paginated preview through `@vivliostyle/react`
- one shared VFM/Vivliostyle-oriented compiler for preview and outputs
- VFM MathML/MathJax, DPUB/Pandoc/GCPM footnote settings, figures and relative document-link rewriting
- cover metadata and generated navigation/TOC
- PDF output profiles for screen, book and press-layout intent
- page size/custom trim size, binding, bleed and crop-mark configuration
- top-level Vivliostyle-rendered PDF print view
- reflowable EPUB 3 with metadata, nav, landmarks, semantic spine and cover-image support
- EPUB-specific theme support and embedded project fonts/assets
- Web Publication output with W3C publication manifest metadata
- exact project source ZIP
- preflight for missing assets/links/themes, metadata, cover, headings, image alt text, duplicate IDs and print risks
- generated EPUB validation for mimetype, OPF XML, navigation XHTML, manifest resources and spine references
- five Git-based starter projects: report, book, magazine, manual and travel guide
- `AGENTS.md` protocol for ChatGPT and other Git-aware agents
- GitHub Pages and Vercel static hosting

## Project structure

```text
publication.yml
content/
assets/
data/
theme/
AGENTS.md
```

Only `publication.yml` is mandatory. See `docs/project-format.md`, `docs/project-protocol.md` and `schemas/publication.schema.json`.

## Important PDF boundary

The browser PDF path uses Vivliostyle pagination and can render trim size, bleed and crop-mark layouts. A **press** profile does not by itself create PDF/X or an ICC/output-intent conversion. Those remain an optional external press-ready step.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Hosting

PubForge is static after the Vite build.

### GitHub Pages

The workflow builds `dist/` and publishes the prebuilt application to the `gh-pages` branch. See `docs/github-pages.md`.

### Vercel

`vercel.json` supplies native COOP/COEP response headers. Vercel is only a static application host, not a publication database or render server.

## Licensing note

PubForge uses public Vivliostyle packages such as `@vivliostyle/react` and `@vivliostyle/vfm`. It does not copy the private AGPL-3.0 `@v/cli-bundle` implementation from the Vivliostyle Pub application.
