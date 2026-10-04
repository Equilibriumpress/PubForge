# GitHub Pages deployment

PubForge supports GitHub Pages and Vercel as static application hosts. Publication rendering still runs in the browser.

## GitHub Pages

The default workflow is `.github/workflows/pages.yml`.

It:

1. installs the app dependencies
2. builds the Vite application
3. writes only the prebuilt `dist/` output to the `gh-pages` branch

This avoids requiring the workflow token to create or administer the Pages site itself.

For a new repository, select the branch once in GitHub:

```text
Settings → Pages
Build and deployment → Deploy from a branch
Branch → gh-pages
Folder → /(root)
```

After that, new commits to `main` refresh the prebuilt `gh-pages` branch automatically.

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

To publish the same prebuilt branch from your own machine instead of GitHub Actions, run:

```bash
bash scripts/publish_prebuilt_pages.sh
```

The script builds PubForge locally, writes only `dist/` to the `gh-pages` branch and pushes it.

This build is independent from publication rendering. Opening and exporting a publication still happens in the user's browser.
