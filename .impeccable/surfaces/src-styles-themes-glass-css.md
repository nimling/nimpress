---
version: 1
slug: "src-styles-themes-glass-css"
primary_target: "src/styles/themes/glass.css"
related_targets: []
---

Scope: the `glass` theme, one stylesheet over stock, applied to every nimpress surface. Mode: Read.

Audience and job: anyone reading a nimpress site, long sessions of prose, code, tables and reference, light and dark.

Constraints: keeps `--np-brand`; WCAG AA over every translucent surface; `prefers-reduced-transparency` and `prefers-contrast` fall back to solid; stock fonts only; tokens and public `np-` classes only, a missing hook is fixed in the library.

## Direction contract

THESIS: Every page is glass laid on light. The brand color is the lamp under the table; refuses the category default of equal frost over purple blobs.

OWN-WORLD: A luminous field lit by one brand bloom from the sidebar corner. Header and sidebar are heavy ground glass; page content sits directly on the lit field with no sheet or card around it, and scrolls under the header, which is clear at rest and frosts as content passes behind it. Code blocks, authored cards and callouts are slips with a frosted label band on the leading edge. State lives in the glass edge: the active row takes a doubled bright edge line.

STORY: The reader sees the brand as light, reads on the lit field, and finds chrome recessed into frost.

FIRST VIEWPORT: Clear header over the lamp, frosting in as content scrolls under it; frosted sidebar left; bloom behind sidebar and header top left; content on the field; rail frosted.

FORM: Lightbox Slides, candidate 4 of 7, seed 257cbab3.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
