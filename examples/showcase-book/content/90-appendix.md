# Appendix: Feature Matrix

This appendix uses an entry-specific stylesheet. The style is deliberately scoped to appendix content so that EPUB chapter-level theming and the combined preview remain compatible.

## Coverage

| Capability | Fixture |
|---|---|
| Cover | SVG cover asset + EPUB cover metadata |
| Front matter | title page, copyright, preface |
| Semantic roles | chapter, appendix, bibliography, colophon |
| Navigation | generated TOC + landmarks |
| VFM | ruby, tables, notes, MathML, raw HTML |
| Assets | SVG figures, CSS background resource, CSV and JSON |
| Links | anchors + cross-document source links |
| Paged media | named pages, recto starts, running heads, folios |
| PDF profile | A5, left binding, 3 mm bleed, crop marks |
| EPUB | reflowable package, nav, spine, metadata, special theme |
| WebPub | reading order + W3C publication manifest |
| Preflight | source checks + generated EPUB inspection |

## Deliberate boundary

PDF/X and ICC conversion are not faked in the browser. The press profile tests trim and page geometry while the preflight keeps the external press-ready step explicit.
