# PubForge project protocol

A compatible project is a Git repository with `publication.yml` at its root.

## Stable contract

The version 1 contract is deliberately small:

- one root manifest
- ordered source content
- one declared publication stylesheet
- optional project assets and data
- browser-generated outputs

The JSON Schema lives at `schemas/publication.schema.json`.

## Directory convention

```text
publication.yml
content/
assets/
data/
theme/
AGENTS.md
```

Only `publication.yml` is mandatory. The other names are conventions, not hard requirements.

## Portability

A PubForge project should remain useful without PubForge. A text editor, Git client and standards-based renderer should still be able to inspect the source.

## Reproducibility

PubForge pins a loaded project to a commit SHA. Preview and export work from that snapshot plus explicit local draft changes.

## Agent compatibility

Projects may include `AGENTS.md`. AI coding and content agents should treat it as the operational contract for source edits.
