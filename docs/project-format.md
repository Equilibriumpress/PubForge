# PubForge project format

A PubForge project is an ordinary Git repository. The repository is the source of truth.

## Required structure

```text
publication.yml
content/
assets/
data/
theme/
```

Only `publication.yml` is mandatory at the repository root. Content and theme paths are declared in the manifest.

## Manifest

```yaml
version: 1
title: Example report
author: Example Author
language: en
type: report

content:
  - content/01-introduction.md
  - path: content/02-findings.md
    breakBefore: page

theme:
  preset: report
  css: theme/publication.css

outputs:
  - print
  - epub
  - webpub
  - project-zip
```

The schema is stored in `schemas/publication.schema.json`.

## Design rule

PubForge stores no hidden publication state outside the project. A compatible repository should remain understandable and editable with ordinary Git tools and a text editor.
