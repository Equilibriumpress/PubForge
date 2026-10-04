# Math, Notes and Cross-References

This chapter tests formulas, semantic footnotes and links between source documents.

## The model

Suppose publication confidence (C) depends on source quality (S), render consistency (R) and preflight coverage (P):

$$
C = \frac{S + R + P}{3}
$$

For a weighted model, let render consistency matter twice as much:

$$
C_w = \frac{S + 2R + P}{4}
$$

The equations are requested as MathML by `publication.yml`, which avoids depending on client-side MathJax for EPUB output.

## Notes

A footnote belongs to the argument without interrupting the reading flow.[^semantic-note] A second note checks repeated note handling across a longer paragraph.[^pipeline-note]

[^semantic-note]: PubForge uses DPUB-style footnote output in this showcase.
[^pipeline-note]: The same VFM configuration feeds preview and export rather than separate Markdown conversions.

## Cross-document links

The vector diagram introduced in [Figures, Tables and Data](04-figures-data.md#pipeline-figure) should remain reachable after VFM rewrites document extensions.

The next chapter explains why [paged media](06-paged-media.md#running-content) needs its own CSS vocabulary.
