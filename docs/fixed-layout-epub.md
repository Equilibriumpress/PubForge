# Fixed-layout EPUB 3

PubForge can export page-designed publications as EPUB 3 Fixed Layout without flattening pages into images.

## Manifest

```yaml
epub:
  layout: fixed
  reflowable: false
  viewport:
    width: 794
    height: 1058
  orientation: portrait
  spread: auto
```

`viewport` is expressed in CSS pixels. If omitted, PubForge derives a stable viewport from the configured PDF page size.

## Page model

For fixed-layout EPUB, every reading-order entry represents one designed page:

```yaml
readingOrder:
  - path: content/page-01.md
    layout: page
  - path: content/page-02.md
    layout: page
```

A printed spread should therefore be authored as two adjacent page entries. This keeps viewport dimensions consistent and lets reading systems decide when to display pages side by side.

## Package output

Fixed-layout EPUB output includes:

- `rendition:layout = pre-paginated`
- configured orientation and spread metadata
- one XHTML spine item per designed page
- a viewport meta element in every page document
- live HTML text, CSS, SVG and image resources
- normal EPUB navigation, landmarks and cover-image metadata

The page XHTML is not a screenshot of the PDF. Text remains text and SVG remains vector artwork.

## Styling

The same magazine source can use physical print units in its theme. The showcase viewport is chosen to match the page aspect ratio at CSS's 96 dpi absolute-unit conversion.

Vendor-specific requirements and dual reflowable/fixed output are handled by the vendor/edition layer.
