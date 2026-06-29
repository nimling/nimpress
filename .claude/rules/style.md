# Styling and theming

Rules for changing how Nimpress looks, both inside the framework and inside consumer overrides.

## Token first

Every visual choice goes through a CSS custom property. Token catalog lives in `src/styles/tokens.css`. Before touching a component's CSS, check whether a token already covers it.

## When to add a token

1. The value appears in more than one component.

2. Consumers will want to override it without forking.

3. It has light and dark variants.

If none of those apply, keep the literal value in the component.

## Class naming

1. Every component root carries a stable `np-<scope>` class.

2. Internal elements carry `np-<scope>-<part>` classes.

3. The class set on rendered chrome is the public API. Renames go through a major version bump.

## Overrides from consumers

Consumers override Nimpress styles by:

1. A site wide stylesheet named in the `css` config field. nimpress loads it after the framework styles, so setting CSS custom properties on `:root` and `html.dark` or targeting the public `np-` classes there wins the cascade.

2. A per page stylesheet named the same as a markdown file. `guide/index.css` next to `guide/index.md` loads while the route is `/guide` or any path under it. A leaf page's stylesheet loads only on its own page. The author writes normal selectors and they apply only while inside that subtree.

Consumers never need to fork the framework to change visuals.

## Light and dark

Every token has a light and a dark value. Adding a token means adding both. Tokens without a dark variant break the theme toggle.

## Geometry tokens

1. `--np-radius-sm`, `--np-radius-md`, `--np-radius-lg`, `--np-radius-pill` for rounded corners. Pick the smallest one that reads correctly.

2. `--np-header-height`, `--np-sidebar-width`, `--np-toc-width`, `--np-content-max` for layout. Sticky positioning math depends on these. Do not bypass them with hardcoded pixels.

## Spacing

No spacing token system. Spacing is per component. Keep values to multiples of 4px for visual rhythm.

## Don't

1. Do not write component scoped styles in `tokens.css`. Tokens describe values, not components.

2. Do not introduce a CSS preprocessor. Vanilla CSS only.

3. Do not introduce a CSS in JS library. Svelte's scoped `<style>` is the carrier.

4. Do not add `!important`. If you reach for it, the cascade is fighting your structure, fix the structure.
