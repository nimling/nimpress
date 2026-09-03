---
id: 16
parent: 9
relations: [25]
title: Highlight, sub and superscript, keyboard keys, image alignment, captions, and theme variants
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:54Z
updated_at: 2026-09-03T11:36:19Z
questions: []
---

## Intent
Zensical formatting: "==highlight==", "^^insert^^", "~~delete~~", sub and superscript with `~` and `^`, keyboard keys with `++ctrl+alt+del++`. Zensical images: alignment with an attribute, captions as figures, lazy loading, `#only-light` and `#only-dark` variants, and a lightbox. nimpress has `markdown-it-attrs` and plain images. Both sets land as markdown pipeline plugins with tokens for their colors.

## Scope
`src/plugin.ts` markdown pipeline. `src/markdown/Page.svelte` only for the lightbox mount, a new `src/markdown/Lightbox.svelte` loaded through a dynamic import. `src/styles/tokens.css` and `src/styles/preflight.css`. `docs/extensions/markdown.md` until task 25 moves it. `docs/styling/prose.md`. `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: add `markdown-it-mark`, `markdown-it-ins`, `markdown-it-sub`, `markdown-it-sup`, and a keys plugin rendering `++ctrl+alt+del++` as `kbd` elements with `np-key` classes and a glyph map for modifier names. Install with pnpm only. `~~` strike is already CommonMark GFM; keep it.
2. nimpress: images. `{align=left}` and `{align=right}` through the existing attrs plugin float the image with `np-img-left` and `np-img-right`. An image alone in a paragraph with a title, `![alt](src "Caption")`, renders as `figure` with `figcaption`. Every image below the first viewport gets `loading="lazy"`. A `#only-light` or `#only-dark` hash on the source renders the image only in that theme through the existing `html.dark` toggle.
3. nimpress: lightbox. An image with `{.zoom}` or every image when the config has `images: { lightbox: true }` opens full size in a `np-lightbox` overlay on click, closed by escape or a click outside. The component loads through a dynamic import inside the page renderer, per the heavy renderer rule.
4. nimpress: write the formatting and images sections of `docs/extensions/markdown.md` in the docs shape with the zensical sentences, "Zensical provides support for several HTML elements that can be used to highlight sections of a document or apply specific formatting" and "Zensical makes working with images more comfortable, providing styles for image alignment and image captions", with the product name swapped to nimpress. Usage headings `### Highlight text`, `### Sub- and superscripts`, `### Add keyboard keys`, `### Image alignment`, `### Image captions`, `### Image lazy-loading`, `### Light and dark mode`, `### Lightbox and zoom`. Add the classes to `docs/styling/prose.md`. Write the `## Formatting and images` changelog section.
5. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
Lint passes and the formatting section renders a highlight, a subscript, a key combination, and a captioned image in `just dev`.

## Summary
