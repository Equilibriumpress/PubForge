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
- automatic discovery of multiple `publication.yml` manifests in one repository
- read-only publication launcher with direct `?manifest=...` deep links
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

## Layout showcase library

The bundled launcher is also a visual regression library. The five nested template publications intentionally exercise different composition systems:

- **Book Typography Showcase** — A5 literary typography, recto chapter starts, running heads, drop caps, footnotes and appendix styling.
- **Evidence Report Showcase** — A4 cover, KPI grid, data chart, evidence tables, recommendation blocks and interpretation rail.
- **Operations Manual Showcase** — technical cover, numbered procedures, warnings, decision cards, code blocks and troubleshooting matrix.
- **Lisbon Weekend Guide** — full-bleed cover, editorial image metadata, route map, fact grid, place cards and itinerary strip.
- **Magazine Layout Showcase** — hero page, multi-column text, pull quote, sidebar and mosaic gallery.

Together with **North Atlantic** and **The Browser Book**, the repository tests both publication formats and visibly different layout systems.

## Publication launcher

A repository may contain more than one PubForge publication. PubForge discovers valid root and nested `publication.yml` manifests and shows them as **Primary**, **Example** or **Starter** cards.

The root manifest remains the default. Any publication can be deep-linked:

```text
?repo=Equilibriumpress/PubForge&manifest=examples/showcase-book/publication.yml
```

Nested projects may use paths relative to their own manifest directory, such as `content/chapter-01.md` and `theme/publication.css`. Existing manifests that already use repository-root paths continue to work.

The launcher is read-only: selecting a publication only changes what PubForge previews, validates and exports.

## Magazine publishing

PubForge supports art-directed magazine projects with page/spread entries, reusable editorial images and lightweight Markdown components for heroes, columns, pull quotes, sidebars and galleries. The active repository showcase is **North Atlantic · Issue 01**.

See `docs/magazine-layout.md`.

## Built-in showcase book

The publication launcher exposes **The Browser Book**, a feature-rich regression publication under `examples/showcase-book/`, alongside the active North Atlantic magazine and starter publications. It exercises semantic front/back matter, VFM math and footnotes, cross-document links, SVG figures, data resources, rich EPUB metadata, paged-media CSS and press-layout settings.

See `examples/showcase-book/README.md` for the coverage matrix and deliberate boundaries.

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

## Review and layout improvement loop

Pages is more than an export screen. The **Review** view adds spread/single-page navigation, zoom, a heuristic audit of the rendered Vivliostyle pages and a browser-only **Layout Lab** for trying page size, margins, columns, text scale and image emphasis.

Useful experiments can be copied as a **ChatGPT improvement brief**. PubForge never saves those experiments itself: ChatGPT applies the real changes to Markdown, `publication.yml` or theme CSS in GitHub.

The **Compare** view can load an earlier commit and render old/new pages side by side with page-count, Preflight and source-delta summaries.

See `docs/review-workflow.md`.

## Production QA

For release candidates, the optional `Publication production QA` GitHub workflow generates real browser artifacts and validates them with EPUBCheck, qpdf, Poppler, page-rendering and edition-parity checks. See `docs/production-qa.md`.

## Dual EPUB editions

Magazine and illustrated projects can export both a reflowable reading edition and a fixed-layout EPUB 3 edition from the same source. Optional Apple Books, Kindle and Kobo QA profiles add distribution-specific metadata and checks without forking the manuscript.

See `docs/fixed-layout-epub.md` and `docs/epub-vendor-profiles.md`.

## Press-ready production

For commercial print jobs, the optional **Press-ready publication** workflow uses the official Vivliostyle CLI to create a heavyweight production PDF with press-ready/PDF-X post-processing, optional font outlining, CMYK handling and an optional ICC output intent. The browser renderer remains the default.

See `docs/press-ready.md`.

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
