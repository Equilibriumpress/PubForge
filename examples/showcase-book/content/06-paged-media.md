# Paged Media

Books have page behavior that responsive websites do not: recto starts, mirrored furniture, running heads, page counters and named page types.

## Running content

The theme captures chapter headings with `string-set` and places them in running page furniture. Left and right pages deliberately use different header positions.

## Page geometry

The active profile uses A5 trim, 3 mm bleed and crop marks. In browser PDF this exercises CSS Paged Media output. PubForge preflight also reports the important boundary: this is not the same as PDF/X conversion with an ICC output intent.

## Named pages

Title, copyright and colophon sections receive named page rules from their semantic roles. The appendix receives an extra scoped theme through its reading-order entry.

{{image:page-anatomy}}

A renderer that preserves these distinctions can make a book feel intentional rather than merely printed from a web page.
