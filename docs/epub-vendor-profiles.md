# EPUB editions and vendor QA

PubForge can produce a reflowable reading edition and a fixed-layout art-directed edition from the same Git source.

## Dual output

```yaml
epub:
  editions:
    - reflowable
    - fixed
  layout: fixed
  viewport:
    width: 794
    height: 1058
```

`layout` remains the preferred/default EPUB edition. `editions` controls the export buttons and production QA.

For image-led magazines, `epub.theme` is normally the reflowable simplification stylesheet. `epub.fixedTheme` can optionally add CSS only to the fixed-layout edition; when omitted, fixed layout keeps the print/editorial theme.

## Vendor QA profile

```yaml
epub:
  vendorProfile: apple-books
```

Supported values:

- `generic`: standards-only EPUB 3 QA.
- `apple-books`: emits Apple Books' `ibooks:specified-fonts` metadata when embedded-font intent is enabled and checks Apple fixed-layout spread choices.
- `kindle`: fixed-layout packages also receive Kindle-compatible fixed-layout metadata such as `original-resolution`, orientation lock and primary writing mode.
- `kobo`: keeps the package standards-based and adds Kobo-specific fixed-layout testing guidance to preflight.

The profile does not fork manuscript content or replace EPUBCheck. It adds distribution metadata and focused warnings on top of the same EPUB 3 package.

## Accessibility

Fixed layout deliberately limits user control over text reflow and text size. PubForge therefore warns when fixed output is enabled and recommends retaining a reflowable edition whenever the content can support it.

## Production QA

The Publication production QA workflow downloads every EPUB edition shown by PubForge and runs EPUBCheck separately for each package. PDFs continue through qpdf/Poppler and edition-parity checks.
