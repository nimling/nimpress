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

## The cascade layer

Every stylesheet the library build emits is wrapped in `@layer nimpress` by the `nimpress:cascade-layer` plugin in `vite.config.ts`. An unlayered consumer rule therefore beats any nimpress rule regardless of specificity, so a plain `.np-card { }` wins against the scoped `.np-card.svelte-hash` nimpress ships.

1. Never write `!important` in library CSS or tell a consumer to. The layer already puts them ahead.

2. Never wrap consumer facing output in a layer. Page stylesheets are injected as raw `<style>` elements by `src/framework/pageStyles.ts` and must stay unlayered.

3. The class set on rendered chrome is the public override surface, documented per area under `docs/styling/`. Adding a class to a component means adding it there in the same change.

## Overrides from consumers

Consumers override Nimpress styles by:

1. A site wide stylesheet named in the `css` config field. nimpress loads it after the framework styles, so setting CSS custom properties on `:root` and `html.dark` or targeting the public `np-` classes there wins the cascade.

2. A per page stylesheet named the same as a markdown file. `guide/index.css` next to `guide/index.md` loads while the route is `/guide` or any path under it. A leaf page's stylesheet loads only on its own page. The author writes normal selectors and they apply only while inside that subtree.

3. A css file that is not a page style, such as a story asset loaded with `?raw`, is named with a leading underscore, `template/_cv.css`. Lint treats underscore css as inert; any other css file must sit next to the markdown page it is named after.

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

5. Do not remove the cascade layer wrap. Without it the documented class surface is not overridable and the styling docs become a lie.
