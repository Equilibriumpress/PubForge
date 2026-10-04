# The Browser Book — PubForge showcase

This directory is the regression publication behind the repository-root `publication.yml`.

## What it exercises

| Area | Coverage |
|---|---|
| Rich metadata | title, subtitle, multiple authors, identifier, publisher, description, subjects, rights, date |
| Semantic reading order | title page, copyright, preface, chapters, appendix, bibliography, colophon |
| Cover | SVG cover + alt text + EPUB cover-image metadata |
| Navigation | generated TOC and landmarks |
| VFM | ruby, tables, code, MathML, DPUB footnotes, raw HTML, figures and captions |
| Cross references | same-document anchors and VFM-rewritten cross-document links |
| Assets | SVG cover/figures, CSS-linked SVG background, CSV/JSON data fixtures |
| Theming | base theme, EPUB-specific theme and entry-specific themes |
| Paged media | named pages, recto starts, mirrored page furniture, running strings and folios |
| PDF profile | A5, left binding, 3 mm bleed, crop marks, press-layout intent |
| EPUB 3 | metadata, nav, landmarks, semantic spine, cover, MathML, resource graph |
| Web Publication | reading order, resources and publication manifest |
| Preflight | metadata, links, assets, CSS resources, image alt, duplicate IDs, print warnings, built EPUB inspection |
| Project snapshot | exact repository snapshot ZIP |

## Deliberate boundaries

The showcase does **not** pretend browser output is PDF/X. Press layout is tested, while PDF/X and ICC/output-intent conversion remain an external press-ready step.

The manifest enables embedded-font intent, but this fixture uses system fonts and does not redistribute font binaries. Audio/video resource handling is supported by the generic resource pipeline but no binary media fixture is committed here.

The raw CSV/JSON files are linked as publication resources to exercise non-visual project assets. Full external EPUBCheck validation of foreign-resource fallback rules is a separate future validation layer; PubForge's current preflight validates the package structure it generates.
