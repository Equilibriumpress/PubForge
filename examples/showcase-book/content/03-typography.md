# Typography and Semantics

<span role="doc-pagebreak" id="page-1" aria-label="1"></span>

This chapter combines ordinary prose with semantic structures that should remain useful in both paged and reflowable output.

## Hierarchy

A publication needs more than large type. Headings create a navigable document outline, influence generated navigation and give assistive technology meaningful landmarks.

### A third-level heading

This paragraph is intentionally long enough to exercise line wrapping, widow/orphan control and paragraph spacing. A book theme should make the text comfortable without encoding editorial meaning into presentation rules.

## Ruby and language

Vivliostyle Flavored Markdown supports ruby annotations. For example, {東京|とうきょう} pairs the Japanese word for Tokyo with its reading, while {出版|しゅっぱん} demonstrates the same syntax for “publishing”.

English text can sit alongside 日本語 without changing the source model.

## Lists

A compact unordered list:

- semantic source
- reproducible rendering
- accessible navigation
- multiple output formats

And an ordered sequence:

1. ChatGPT edits source files.
2. GitHub records the commit.
3. PubForge reads the pinned snapshot.
4. Preview and outputs use the same compiled publication.

## Code

A publication can include source fragments when the subject demands it:

```yaml
pdf:
  profile: press
  size: A5
  bleed: 3mm
  cropMarks: true
```

The example continues with [figures, tables and data](04-figures-data.md).
