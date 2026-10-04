# PubForge agent guide

PubForge is a renderer, preflight tool and output engine. Editorial work happens in ChatGPT and is committed to GitHub before PubForge reads it.

## Source of truth

Git is the source of truth. Do not move publication state into a browser editor, database, generated cache or hidden service.

For publication projects:

- `publication.yml` version 2 defines publication metadata, semantic reading order, theme, VFM settings and output profiles.
- `readingOrder` is the canonical sequence of publication source files.
- Markdown or other declared source files contain publication content.
- `theme/` contains print and publication CSS.
- `assets/` contains images, diagrams, fonts and other publication assets.
- `data/` contains source datasets when a publication uses them.
- Keep project-relative links stable.
- Prefer editable source files over generated binaries.
- Do not commit generated PDF, EPUB or WebPub output unless the user explicitly requests release artifacts in Git.

## Editing protocol

When changing a publication:

1. Read `publication.yml`.
2. Check every declared reading-order, theme, cover and asset path before editing.
3. Make the smallest coherent source change.
4. Keep references relative to the project.
5. If adding a content file, add an object with `path` and semantic `role` to `readingOrder`.
6. If adding an asset, use a descriptive stable filename and alt text where relevant.
7. Keep detailed page typography, running content and layout rules in CSS.
8. Use the `pdf`, `epub`, `webpub` and `vfm` blocks for output intent and renderer behavior.
9. Commit publication source changes atomically with a concise description.
10. Use PubForge after the commit to preview, preflight and export the pinned Git snapshot.

## ChatGPT workflow

Natural-language requests map to Git operations. Examples:

- "Add a chapter about housing" → add a Markdown file and register it in `readingOrder`.
- "Make this an A5 book" → set `pdf.size: A5` and adjust the theme CSS if margins/typography should change.
- "Put chapter 3 before chapter 2" → reorder `readingOrder`.
- "Add this CSV and make a figure" → add the dataset under `data/`, add the resulting figure under `assets/`, then reference it from content.
- "Enable MathML and EPUB footnotes" → configure `vfm.mathRenderer: mathml` and `vfm.footnote: dpub`.
- "Prepare this for print" → configure the PDF profile and run PubForge preflight; do not claim browser PDF is PDF/X.

Do not invent a second content model or browser editing workflow when the requested change fits the Git project.


## Review feedback protocol

PubForge Review, Layout Lab and Compare are disposable browser review state, not publication source.

When the user provides a copied PubForge improvement or comparison brief:

1. Resolve the repository, commit and manifest named in the brief.
2. Read the listed likely source files plus any related theme or manifest configuration.
3. Treat heuristic layout findings as prompts to inspect, not automatic truth.
4. Apply only improvements that make sense for the publication.
5. Translate useful Layout Lab experiments into normal theme CSS / manifest source.
6. Commit the smallest coherent source change.
7. Re-run PubForge on the new commit.
8. Never persist the brief itself as hidden publication state or recreate a browser CMS.
