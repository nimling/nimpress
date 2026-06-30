---
title: Styling
description: Override the theme through CSS tokens and the stable public classes.
order: 4
---

Nimpress drives every visual choice through a CSS custom property. The first move is always to override a token, not a component. When a token does not reach far enough, target one of the stable public classes.

## Where overrides go

1. Site wide. Name a stylesheet in the `css` config field. Nimpress loads it after the framework styles, so a rule there wins the cascade.

2. Per page. A stylesheet named like a markdown file loads while that route is open. `guide/index.css` next to `guide/index.md` loads on `/guide` and every path under it. A leaf page stylesheet loads only on its own page.

Set tokens on `:root` for light and `html.dark` for dark. Every token needs both values, or the theme toggle breaks.

```css
:root {
  --np-brand: #6d5efc;
  --np-radius-md: 0.6em;
}
html.dark {
  --np-bg: #0b0b10;
  --np-brand: #8b7dff;
}
```

## Token catalog

| Group | Tokens |
|-------|--------|
| Brand | `--np-brand`, `--np-brand-hover`, `--np-brand-soft`, `--np-text-on-brand` |
| Surfaces | `--np-bg`, `--np-bg-surface`, `--np-bg-card`, `--np-bg-sidebar`, `--np-bg-code-block`, `--np-bg-code-inline` |
| Text | `--np-text-primary`, `--np-text-secondary`, `--np-text-muted`, `--np-text-faint`, `--np-text-code-block`, `--np-link` |
| Lines | `--np-border`, `--np-border-strong`, `--np-divider` |
| Callouts | `--np-tip`, `--np-note`, `--np-warning`, `--np-info`, `--np-check`, `--np-danger` |
| HTTP methods | `--np-method-get`, `--np-method-post`, `--np-method-put`, `--np-method-patch`, `--np-method-delete` |
| Tables | `--np-table-header-bg`, `--np-table-row-alt`, `--np-table-row-hover` |
| Radius | `--np-radius-sm`, `--np-radius-md`, `--np-radius-lg`, `--np-radius-pill` |
| Geometry | `--np-header-height`, `--np-sidebar-width`, `--np-toc-width`, `--np-content-max` |
| Fonts | `--np-font-sans`, `--np-font-mono` |
| Shadows | `--np-shadow-card`, `--np-shadow-modal` |

Add tokens when a value repeats across components or needs a light and dark pair. Keep a literal value in the component when it appears once.

## Public classes

Every component root carries a stable `np-<scope>` class, and its inner parts carry `np-<scope>-<part>`. These class names are the public API and stay stable across minor versions. Target them when a token does not cover the change.

| Area | Root class | Notes |
|------|-----------|-------|
| App frame | `np-app` | The outermost shell |
| Header | `np-header` | `np-header-text`, `np-header-border` for parts |
| Sidebar | `np-sidebar` | `np-group-header` for group labels |
| Right rail | `np-toc` | Table of contents on doc pages |
| Page column | `np-page` | `np-prose` wraps the rendered markdown |
| Callouts | `np-callout` | `np-callout-tip`, `np-callout-note`, `np-callout-warning`, `np-callout-info`, `np-callout-check` |
| Code | `np-code`, `np-code-group` | `np-code-copy`, `np-code-lang` for parts |
| Cards | `np-cards`, `np-card` | Feature style content cards |
| Actions | `np-actions`, `np-action` | `np-action-primary`, `np-action-secondary`, `np-action-ghost` |
| Features | `np-features-grid`, `np-feature` | Hero and landing grids |
| Hero | `np-hero` | `np-hero-title`, `np-hero-tagline`, `np-hero-lead`, `np-hero-body` |
| Changelog | `np-changelog` | `np-changelog-entry-title`, `np-changelog-version` |
| OpenAPI | `np-api` | `np-method` plus `np-method-get` through `np-method-delete` |
| Back to top | `np-back-to-top` | Floating control |

## Rules

1. Override tokens before classes. Reach for a class only when no token covers the change.

2. Do not fork the framework. The `css` field and per page stylesheets are enough.

3. Avoid `!important`. If you need it, the structure is fighting you.

4. Public class names change only across a major version. Tokens are added, never renamed.
