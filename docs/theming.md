---
title: Theming
sidebar:
  name: Setup
  path: setup
tags: Setup, Styling
order: 6
---

A theme is the whole look of a site: its tokens, its class rules, and the components that render its chrome. nimpress ships two themes, `stock` and `glass`, and every surface a built in theme touches is one a site can reach the same way. No fork is ever required.

## Configuration

### Choose a theme

`theme` names a built in theme or points at a stylesheet. `stock` is the default and needs no configuration. `glass` lays frosted glass surfaces over a field lit by the brand color. A path loads that stylesheet as the theme, built on top of `stock`.

Add the following lines to your configuration:

```json
{
  "theme": "glass"
}
```

The active name lands on the root element as `data-np-theme`, and every built in theme scopes its rules to it, `html[data-np-theme="glass"]`. A path theme is named after its file, so `docs/theme/ocean.css` is `ocean`.

### Offer several themes

`themes` lists the themes a reader can switch between from the palette menu in the header. `theme` stays the default, and the reader's choice is remembered across visits. The menu shows only when the list holds more than one theme.

Add the following lines to your configuration:

```json
{
  "theme": "stock",
  "themes": ["stock", "glass"]
}
```

A stylesheet theme in the list scopes its rules to its own name, `html[data-np-theme="ocean"] { ... }`, so it applies only while the reader has it selected.

### Replace a component

`components` maps a component name to a Svelte file that renders in its place everywhere nimpress would render the stock one. The replaceable components are:

1. Shell: `Header`, `Announce`, `Footer`, `Sidebar`, `SidebarNode`, `Breadcrumbs`, `RightToc`, `BackToTop`, `SearchModal`, `AccountMenu`, `ThemeMenu`.

2. Markdown blocks: `CodeBlock`, `CodeGroup`, `Tabs`, `Actions`, `Feature`, `Card`, `CardGroup`, `Lightbox`, `MermaidBlock`, `MathBlock`, `DBMLBlock`, `ComponentEmbed`.

3. Page parts: `Feedback`, `SubscribeDialog`.

4. OpenAPI: `Operation`, `Schema`, `ParamRow`, `MethodBadge`, `CodeExamples`, `TryPanel`, `TryDialog`.

Callouts render as plain markup and change through their classes. The component workshop harness renders inside its own frame and changes through the `harness` and `css` fields of its module system. Page renderers are replaced through `pageTypes`, see [Custom page types](/page-types/custom).

Add the following lines to your configuration:

```json
{
  "components": {
    "Footer": "./docs/theme/Footer.svelte"
  }
}
```

The replacement receives the same props as the stock component. Every stock component except `SidebarNode`, whose name the sidebar type holds, is exported from `@nimtech/nimpress`, so a replacement can wrap the stock one instead of rewriting it:

```svelte
<script lang="ts">
  import { Footer } from '@nimtech/nimpress'
</script>

<div class="site-footer">
  <Footer />
  <p>Hosted by the platform team.</p>
</div>
```

## Usage

### Order of the layers

Styles apply in a fixed order, and each layer wins over the one before it:

1. The `stock` styles, inside the `nimpress` cascade layer.

2. The theme stylesheet.

3. The stylesheets named in `css`.

4. Component styles from `styles/` in the content folder, then page stylesheets beside the markdown files.

A plain rule in your own stylesheet always beats nimpress, whatever its specificity. See [Styling](/styling) for why.

### Write a theme

A theme is a stylesheet that sets tokens under `:root` and `html.dark` and targets the public `np-` classes. Start from the token catalog below, then reach for the classes in [Styling](/styling) when a token cannot express the change.

```css
:root {
  --np-bg: #f5f7fb;
  --np-radius-md: 14px;
}

html.dark {
  --np-bg: #0b0f17;
}

.np-header {
  border-bottom-width: 2px;
}
```

Point `theme` at the file to load it as the theme. Put it in `css` instead to layer it over a built in theme.

## Tokens

Tokens live in `src/styles/tokens.css`. Every token has a light value under `:root` and a dark value under `html.dark`.

1. Brand: `--np-brand`, `--np-brand-hover`, `--np-brand-soft`, `--np-link`, `--np-text-on-brand`.

2. Surfaces: `--np-bg`, `--np-bg-surface`, `--np-bg-sidebar`, `--np-bg-card`, `--np-bg-code-inline`, `--np-bg-code-block`.

3. Text: `--np-text-primary`, `--np-text-secondary`, `--np-text-muted`, `--np-text-faint`, `--np-text-code-block`.

4. Borders: `--np-border`, `--np-border-strong`, `--np-divider`.

5. Header: `--np-header-bg`, `--np-header-border`, `--np-header-text`, unset by default so the header follows the surface tokens.

6. Tables: `--np-table-header-bg`, `--np-table-row-alt`, `--np-table-row-hover`.

7. Code chrome: `--np-code-bar-bg`, `--np-code-bar-border`, `--np-code-bar-border-strong`, `--np-code-bar-hover`, `--np-code-bar-text`, `--np-code-bar-text-active`, `--np-code-gutter`, `--np-code-line-highlight`, `--np-code-annotation`, `--np-code-annotation-text`.

7.1. Surfaces inside code and dialogs: `--np-code-inset`, `--np-shimmer`, `--np-shadow-inset`, `--np-lightbox-control`, `--np-lightbox-control-hover`, `--np-lightbox-control-text`.

8. Callouts: `--np-tip`, `--np-note`, `--np-warning`, `--np-info`, `--np-check`, `--np-abstract`, `--np-success`, `--np-question`, `--np-failure`, `--np-danger`, `--np-bug`, `--np-example`, `--np-quote`.

9. HTTP methods: `--np-method-get`, `--np-method-post`, `--np-method-put`, `--np-method-patch`, `--np-method-delete`.

10. Overlays: `--np-overlay` behind dialogs and search, `--np-overlay-soft` behind the mobile drawer, `--np-lightbox-backdrop`, `--np-mark-bg`.

11. Elevation: `--np-shadow-card`, `--np-shadow-popover`, `--np-shadow-modal`, `--np-shadow-dialog`.

12. Geometry: `--np-radius-sm`, `--np-radius-md`, `--np-radius-lg`, `--np-radius-pill`, `--np-header-height`, `--np-sidebar-width`, `--np-toc-width`, `--np-content-max`.

13. Typography: `--np-font-sans`, `--np-font-mono`.

## Customization

### Brand color

`brand` in the config writes `--np-brand`, `--np-link`, `--np-tip`, and `--np-brand-hover` into the `nimpress` layer at startup, so one value colors every theme and a theme or a site stylesheet can still override each of them.

```json
{
  "brand": { "primary": "#CC785C", "primaryHover": "#B86A52" }
}
```

### Tailwind preset

`@nimtech/nimpress/tailwind` exports a preset matching the token palette. Extend it in your `tailwind.config.ts` to author utilities that match the framework chrome.

## Restyling

The complete class reference, grouped by area, is in [Styling](/styling).
