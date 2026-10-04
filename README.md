# PubForge

Git-native publication studio for browser-based web and print publishing.

PubForge treats a GitHub repository as the publication project. Content, assets, data, themes, history and publication configuration live together in Git. The browser reads a pinned commit, mirrors the project into a local workspace and renders it without a publication backend.

## Current feature set

- public GitHub repository loading by `owner/repo`, GitHub URL or `owner/repo@ref`
- `publication.yml` project format with JSON Schema
- immutable commit snapshots
- OPFS-backed browser cache with an in-memory editable workspace
- Publication Studio with Files, Source, Metadata, Theme, Preview, Export, History and Commit views
- Vivliostyle paginated preview through `@vivliostyle/react`
- VFM Markdown conversion
- project-relative images, fonts and CSS assets
- Print / Save PDF browser flow
- EPUB 3 export
- Web Publication ZIP export
- exact project ZIP export with source commit metadata
- five file-based starter projects: report, book, magazine, manual and travel guide
- `AGENTS.md` protocol for ChatGPT and other Git-aware agents
- direct GitHub write-back as one atomic commit with remote-SHA conflict protection
- Git commit history with earlier snapshots opened directly in PubForge
- Vercel hosting with native COOP/COEP headers
- GitHub Pages hosting with a static cross-origin-isolation service worker

No publication database is required. GitHub is the source of truth.

## Project structure

```text
publication.yml
content/
assets/
data/
theme/
AGENTS.md
```

Only `publication.yml` is mandatory. A project may use different directory names because the manifest declares the ordered content and theme paths.

See `docs/project-format.md`, `docs/project-protocol.md` and `schemas/publication.schema.json`.

## Example manifest

```yaml
version: 1
title: Example report
author: Example Author
language: en
type: report

content:
  - content/01-introduction.md
  - content/02-findings.md

theme:
  preset: report
  css: theme/publication.css

outputs:
  - print
  - epub
  - webpub
  - project-zip
```

## Run locally

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## Hosting

PubForge is static after the Vite build.

### GitHub Pages

`.github/workflows/pages.yml` builds and deploys `dist/`. GitHub Pages lacks custom response-header configuration, so PubForge ships a same-origin service worker that supplies the COOP/COEP headers required by browser workloads after the first controlled reload.

A no-Actions branch publishing route is also available:

```bash
bash scripts/publish_prebuilt_pages.sh
```

See `docs/github-pages.md`.

### Vercel

`vercel.json` supplies native COOP/COEP response headers. Vercel remains a static app host. It is not a publication database or render server.

## GitHub write-back

Studio edits remain local until the user explicitly commits them. The Commit view accepts a fine-grained GitHub token with repository Contents read/write permission.

The token stays in React memory only and is cleared after a successful commit. It is never written to Git, OPFS or browser storage.

Before writing, PubForge checks that the remote branch still points to the commit from which the workspace was opened.

## ChatGPT workflow

ChatGPT does not need an AI endpoint inside PubForge.

```text
User request
      ↓
ChatGPT
      ↓
GitHub project files
      ↓
PubForge
      ↓
Preview / PDF / EPUB / WebPub
```

See `docs/chatgpt-github-workflow.md` and `AGENTS.md`.

## Architecture

```text
GitHub repository
      ↓
GitHubStorageProvider
      ↓
Pinned commit snapshot
      ↓
OPFS + editable browser workspace
      ↓
VFM + Vivliostyle
      ↓
Preview / Print / EPUB / WebPub / Project ZIP
      ↓
optional atomic GitHub commit
```

The PubForge repository itself contains a root `publication.yml`, so it also acts as a small test publication.
