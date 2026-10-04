# ChatGPT + GitHub workflow

PubForge is designed so ChatGPT can manage a publication through ordinary GitHub source files. PubForge itself is deliberately read-only.

## Control path

```text
User request
  ↓
ChatGPT
  ↓
GitHub source files + commit
  ↓
PubForge reads pinned commit
  ↓
Preview → Preflight → Output
```

The browser application does not need an AI provider or editorial UI.

## Common operations

### Create a publication

Start from one of the starter projects under `public/templates/`, update manifest v2 metadata and replace the sample reading order/content.

### Add content

Create the source file and add it to `readingOrder` in `publication.yml`.

### Change print design

Use the `pdf` block for output profile intent such as size, binding, bleed and crop marks. Use the declared theme CSS for margins, running content, page selectors, typography and complex paged-media rules.

### Configure EPUB

Use the `epub` and `vfm` blocks for reflowable output, EPUB-specific theme, embedded-font intent, MathML and semantic footnotes. Add cover metadata and a cover asset when appropriate.

### Add data or media

Store reusable source data in `data/`. Store images, diagrams and fonts in `assets/`. Reference them with relative paths.

### Reorganize a publication

Change `readingOrder` instead of renaming every file unless filenames themselves are misleading.

## Commit discipline

A publication change should usually be one coherent commit or pull request. PubForge previews and exports exactly that committed snapshot.

Generated output stays outside source commits unless the output itself is the requested release artifact.
