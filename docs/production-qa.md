# Production QA

PubForge's browser preflight remains the fast default. The optional **Publication production QA** workflow validates generated artifacts with external tools.

## What it does

1. Builds the current PubForge app.
2. Opens the requested public publication repository with Playwright.
3. Downloads the browser-generated EPUB.
4. Produces normal, print and high-quality PDF edition artifacts from the same Vivliostyle print route.
5. Runs EPUBCheck 5.4.0.
6. Runs qpdf structural checks on every PDF.
7. Captures Poppler page-box, font and image reports.
8. Renders every PDF page to PNG for visual inspection.
9. Verifies edition page-count parity.
10. Writes SHA-256 checksums and a QA summary.
11. Uploads everything as a GitHub Actions artifact.

## Running it

Open **Actions → Publication production QA → Run workflow**.

By default it checks `Equilibriumpress/PubForge`. You can supply another public `owner/repository` and a ref/commit.

This workflow is deliberately separate from normal GitHub Pages builds because browser preview/export does not need qpdf, Poppler, Java, Chromium installation or EPUBCheck.
