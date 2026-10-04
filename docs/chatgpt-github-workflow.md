# ChatGPT + GitHub workflow

PubForge is designed so an AI agent can manage a publication without a PubForge-specific API.

## Control path

```text
User request
  ↓
ChatGPT
  ↓
GitHub source files
  ↓
PubForge browser workspace
  ↓
Vivliostyle preview and exports
```

The browser application does not need an AI provider. ChatGPT changes the same Git repository that PubForge opens.

## Common operations

### Create a publication

Start from one of the starter projects under `public/templates/`, then set metadata and replace the sample content.

### Add content

Create the new source file and add its path to the ordered `content` list in `publication.yml`.

### Change print design

Edit the stylesheet declared by `theme.css`. Page size, margins, running content, breaks and typography should stay in CSS.

### Add data or media

Store reusable source data in `data/`. Store images, diagrams and fonts in `assets/`. Reference them with relative paths.

### Reorganize a publication

Change the order in `publication.yml` instead of renaming every file unless filenames themselves are misleading.

## Commit discipline

A publication change should usually be one coherent commit or pull request. Keep generated output out of source commits unless the output itself is the requested release artifact.

## Browser edits

Local Studio edits are drafts until they are written back to GitHub. The commit SHA shown by PubForge identifies the remote source snapshot from which the workspace started.
