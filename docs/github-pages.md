# GitHub Pages deployment

PubForge supports GitHub Pages and Vercel as static application hosts. Publication rendering still runs in the browser.

## GitHub Pages

The default Pages workflow is `.github/workflows/pages.yml`.

It:

1. installs the app dependencies
2. builds the Vite application
3. uploads only `dist/`
4. deploys the static artifact to GitHub Pages

The workflow requests Pages enablement through `actions/configure-pages@v5`. Repository or organization policy may still require a one-time Pages setting change.

## Cross-origin isolation

GitHub Pages does not expose arbitrary response-header configuration. PubForge therefore ships `public/coi-serviceworker.js`.

On a host where `crossOriginIsolated` is already true, the script does nothing.

On a compatible HTTPS static host without COOP/COEP headers, the script registers itself as a service worker, reloads the first visit once and adds these headers to controlled responses:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
```

This keeps the Pages variant ready for browser/WASM workloads while Vercel continues to use native response headers from `vercel.json`.

## No-Actions publishing

If you prefer branch-based Pages and want no GitHub Actions build, run:

```bash
bash scripts/publish_prebuilt_pages.sh
```

The script builds PubForge locally, writes only `dist/` to the `gh-pages` branch and pushes that branch.

Then configure Pages as:

```text
Deploy from a branch
gh-pages
/(root)
```

This build is independent from publication rendering. Opening and exporting a publication still happens in the user's browser.
