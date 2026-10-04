# PubForge agent guide

This repository is a PubForge publication project or a PubForge-compatible application repository.

## Source of truth

Git is the source of truth. Do not move publication state into a database, generated cache or hidden service.

For publication projects:

- `publication.yml` defines title, language, ordered content, theme and enabled outputs.
- Markdown or other declared source files contain publication content.
- `theme/` contains print and publication CSS.
- `assets/` contains images, fonts and other publication assets.
- `data/` contains source datasets when a publication uses them.
- Keep project-relative links stable.
- Prefer editable source files over generated binaries.
- Do not commit generated PDF, EPUB or WebPub output unless the user explicitly requests release artifacts in Git.

## Editing protocol

When changing a publication:

1. Read `publication.yml`.
2. Check every declared content and theme path before editing.
3. Make the smallest coherent source change.
4. Keep references relative to the project.
5. If adding a content file, add it to `publication.yml` in the intended reading order.
6. If adding an asset, use a descriptive stable filename.
7. Keep print CSS inside the declared theme file unless a separate stylesheet is intentionally added.
8. Preserve outputs unless the user asks to change them.
9. Commit publication source changes atomically with a concise description.

## ChatGPT workflow

Natural-language requests should map to file operations. Examples:

- "Add a chapter about housing" → add a Markdown file and register it in `publication.yml`.
- "Make this A4 landscape" → change the declared theme CSS.
- "Put chapter 3 before chapter 2" → reorder the `content` list.
- "Add this CSV and make a figure" → add the dataset under `data/`, add the figure under `assets/`, then reference it from content.
- "Change the author" → edit `publication.yml`.

Do not invent a second content model when the requested change fits the existing files.
