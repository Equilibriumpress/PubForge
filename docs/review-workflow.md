# Review, Layout Lab and Git workflow

PubForge's review tools are a feedback layer between committed publication source and the next ChatGPT/GitHub edit. They are deliberately not an editor.

## Control loop

```text
ChatGPT writes/edits publication source
        ↓
GitHub commit
        ↓
PubForge pinned snapshot
        ↓
Preview
        ↓
Review
  - page/spread navigation
  - zoom
  - rendered-page layout audit
  - temporary Layout Lab experiments
        ↓
Copy improvement brief
        ↓
ChatGPT changes GitHub source
        ↓
new commit
        ↓
Compare old/new commits
        ↓
Preflight → Output
```

## Review

The Review view uses the same Vivliostyle renderer as publication preview, but adds controls intended for design inspection:

- single-page or spread viewing
- multiple zoom levels
- page rail navigation
- heuristic analysis of the rendered Vivliostyle page boxes
- per-page text/image metrics
- links from layout findings back to the affected page

Layout audit warnings are prompts for human review, not release blockers. Technical validity remains the responsibility of Preflight.

## Layout Lab

Layout Lab injects a temporary Vivliostyle author stylesheet into the browser review only. It can try:

- A5, A4 and 6 × 9 inch page sizes
- compact, standard and airy margins
- one, two or three columns
- body text scaling
- restrained or emphasized editorial images

It also includes quick Book airy, Editorial and Compact presets.

No Layout Lab setting is written to GitHub, local project source or a hidden database.

If an experiment is useful, choose **Copy improvement brief**. The brief records the publication commit, selected page, rendered audit findings, temporary layout choices and likely source files. Give that brief to ChatGPT so the actual Markdown, publication manifest or CSS can be changed and committed normally.

## Compare

Compare loads an earlier Git commit of the same publication on demand.

Both snapshots are rendered with Vivliostyle at the same page and zoom. The comparison reports:

- page count
- Preflight error/warning counts
- changed files in the compiled publication resource graph
- synchronized visual pages

**Copy comparison brief** turns those facts into a Git-aware task for ChatGPT.

## Source-of-truth rule

Review state is disposable.

The only durable publication state is the committed Git project:

- `publication.yml`
- content sources
- theme CSS
- assets and data

If a layout experiment matters, it must eventually become an ordinary source change and Git commit.
