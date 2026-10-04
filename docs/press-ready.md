# Press-ready production

PubForge keeps interactive preview and ordinary PDF output browser-side. Commercial print preparation is an optional GitHub Actions workflow because PDF/X conversion, font outlining, CMYK post-processing and ICC output intents require heavyweight native tooling.

## Manifest

Configure the production step under `pdf.production`:

```yaml
pdf:
  profile: press
  size: A5
  bleed: 3mm
  cropMarks: true
  cropOffset: 13mm
  production:
    enabled: true
    preflight: press-ready-local
    preflightOptions:
      - enforce-outline
    cmyk: false
    # outputIntent: assets/icc/ISOcoated_v2_eci.icc
```

Supported fields:

- `enabled`: enables the production workflow contract.
- `preflight`: `press-ready` uses the Docker-based press-ready process recommended by Vivliostyle; `press-ready-local` runs the same class of conversion locally.
- `preflightOptions`: passed to Vivliostyle's PDF post-processing. Typical values include `enforce-outline` and `gray-scale`.
- `cmyk`: enables Vivliostyle's DeviceCMYK post-processing support. This does not automatically make arbitrary RGB artwork suitable for a printing condition.
- `outputIntent`: project-relative ICC profile path embedded as the PDF output intent.

GitHub-hosted Actions uses `press-ready-local` in the bundled showcase because it avoids Docker-in-Docker path translation while exercising the same official press-ready conversion locally. The `press-ready` Docker mode remains available for environments where its mount layout is controlled.

## Workflow

Run **Actions → Press-ready publication**.

The workflow:

1. Checks out PubForge and fetches the requested public publication repository at a pinned ref.
2. Builds the current PubForge browser application.
3. Uses PubForge itself to export a prepared Web Publication. This preserves browser-side VFM conversion, Mermaid/Shiki preparation, theme package resolution and the publication resource graph.
4. Generates a temporary official Vivliostyle CLI configuration from `publication.yml` plus that prepared WebPub.
5. Runs `@vivliostyle/cli@11.3.3` in an isolated dependency tree.
6. Applies the configured `pdfPostprocess` options, including press-ready/PDF-X processing, optional font outlining, CMYK handling and optional ICC output intent.
7. Runs qpdf and Poppler diagnostics.
8. Produces a SHA-256 checksum and uploads the PDF plus diagnostics as a workflow artifact.

## Why the CLI is isolated

PubForge's browser app currently uses Vite 7. Vivliostyle CLI 11.3.3 requires Vite 8. The workflow installs the CLI under `/tmp/pubforge-vivliostyle-cli` so production tooling cannot mutate or destabilize the browser application's dependency graph.

## Important color boundary

`cmyk: true` enables the CLI's CMYK post-processing behavior. It is not a substitute for choosing a real printing condition, preparing imagery correctly and supplying the matching ICC output profile.

For jobs where color accuracy matters, commit the printer-supplied or otherwise properly licensed ICC profile into the publication project and reference it through `outputIntent`.

## Relation to Production QA

The **Publication production QA** workflow validates browser artifacts with EPUBCheck, qpdf, Poppler, page rendering and edition parity.

The **Press-ready publication** workflow creates the heavyweight print artifact with the official Vivliostyle CLI.

They are intentionally separate so normal Pages builds and everyday publication preview stay lightweight.
