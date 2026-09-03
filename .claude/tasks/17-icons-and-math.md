---
id: 17
parent: 9
relations: [25, 22]
title: Icon shortcodes in markdown and math blocks
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:54Z
updated_at: 2026-09-03T11:36:20Z
questions: []
---

## Intent
Zensical: "use more than 10,000 icons and thousands of emojis in your project documentation with practically zero additional effort" through `:shortcode:` syntax, and math through KaTeX with `$...$` and `$$...$$`. nimpress renders emoji as the author types them and has no icon shortcode and no math. nimpress already carries the lucide glyphs for the roadmap kinds in `src/plugin.ts:149` and `sidebar.icon` accepts svg; icons by shortcode build on that.

## Scope
`src/plugin.ts` markdown pipeline and the icon resolver. `src/markdown/MathBlock.svelte` new, loaded through a dynamic import. `src/styles/tokens.css`. `docs/extensions/markdown.md` until task 25 moves it. `docs/styling/prose.md`. `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: icons. `:lucide-braces:` inline renders the lucide svg inlined at build time with a `np-icon` class, and `:lucide-braces:{.lg .brand}` takes attrs through the existing plugin. The resolver reads the `lucide-static` package installed with pnpm and a site `icons` config folder for custom svg files, `:custom-name:` resolving to `<icons>/name.svg`. An unknown shortcode stays as text and lint warns. Emoji shortcodes `:rocket:` resolve through `markdown-it-emoji`. The same resolver serves `sidebar.icon`, `tags` icons from task 5, and `social` icons from task 14, so one resolver owns icon names.
2. nimpress: math. `$$...$$` on its own lines renders a display block and `$...$` renders inline, through `markdown-it-katex` or a fence pass that hands the source to a `MathBlock.svelte` loading katex through a dynamic import, per the heavy renderer rule. The katex stylesheet is loaded only on pages that carry math. A `math: false` config field turns the syntax off for sites that write dollar signs.
3. nimpress: write the icons and math sections of `docs/extensions/markdown.md` in the docs shape with the zensical sentences and the product name swapped, usage `### Use emojis`, `### Use icons`, `### with colors`, `### with animations`, `### Use block syntax`, `### Use inline block syntax`. Add the classes to `docs/styling/prose.md`. Write the `## Icons and math` changelog section.
4. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
Lint passes and a page with `:lucide-braces:` and a `$$` block renders the glyph and the formula in `just dev`.

## Summary
