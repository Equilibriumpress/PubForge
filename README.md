# PubForge

Git-native publication studio for browser-based web and print publishing.

PubForge treats a GitHub repository as the publication project. Content, assets, data, themes and publication configuration live together in Git. The browser reads a pinned commit, mirrors the project into a local workspace and renders it without a publication backend.

## Current milestone

Version 0.1 includes:

- public GitHub repository loading by `owner/repo`, GitHub URL or `owner/repo@ref`
- `publication.yml` project format with JSON Schema
- immutable commit snapshots
- OPFS-backed browser cache with an in-memory workspace
- Vivliostyle paginated preview through `@vivliostyle/react`
- VFM Markdown conversion
- project-relative images and CSS assets
- Print / Save PDF browser flow
- EPUB 3 export
- Web Publication ZIP export
- exact project ZIP export with source commit metadata
- Vercel headers for cross-origin isolated browser workloads

No database is required. GitHub is the source of truth.

## Project structure

```text
publication.yml
content/
assets/
data/
theme/
```

A project may use different directory names. `publication.yml` declares the ordered content and theme paths.

See `docs/project-format.md` and `schemas/publication.schema.json`.

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

The application is static after the Vite build. Vercel is the preferred first deployment target because `vercel.json` sets the response headers required by heavier browser/WASM features planned for later milestones.

The publication itself is still rendered locally in the browser. Vercel is not a publication database or render server.

## Architecture

```text
GitHub repository
      ↓
GitHubStorageProvider
      ↓
Pinned commit snapshot
      ↓
OPFS + browser workspace
      ↓
VFM + Vivliostyle
      ↓
Preview / Print / EPUB / WebPub / Project ZIP
```

The repository contains a root `publication.yml` so PubForge itself also works as a small test publication.

## Next milestone

Planned next steps are a Studio interface with Files, Source, Metadata and Theme views, reusable templates, GitHub write-back, commit history and a GitHub Pages deployment experiment.
