# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone reading a site nimpress renders. nimpress is a general docs engine, so a site can be developer documentation, an API reference, a component workshop, a changelog, a roadmap, a product landing, or anything else built from markdown. Authors are the people running a site: they pick page types, a theme, and overrides in `nimpress.config`.

## Product Purpose

nimpress turns a folder of markdown with typed frontmatter into a complete site: shell, sidebar, search, page types, component workshop, and build. Success is a site that needs no fork of the framework to look and behave the way its owner wants.

## Positioning

Every visual decision is reachable from outside the library: tokens in `src/styles/tokens.css`, the stable `np-` class surface wrapped in the `nimpress` cascade layer, page and component stylesheets, custom page types, component replacement, and selectable themes. `stock` is the default theme; further themes such as `glass` are built on the same surface a consumer uses, and each one proves that surface is complete.

## Operating Context

1. A site author sets `theme` in `nimpress.config`, then refines it with the `css` stylesheets, per page stylesheets, `components`, and `pageTypes`.

2. This repository's own `docs/` site is the test instance for every theme, served by `just dev` and published to `nimling.github.io/nimpress`.

## Capabilities and Constraints

1. Svelte 5 with runes, vanilla CSS, no preprocessor, no CSS in JS, no `!important`.

2. Every token carries a light and a dark value.

3. Public class names and token names stay stable; new ones are added, never renamed outside a major bump.

4. A theme that needs a surface the library does not expose is a gap to fix in the library, never a workaround in the theme.

## Brand Commitments

1. A theme keeps the site's brand color: `brand.primary` in the config writes `--np-brand`, and every theme colors itself from it.

2. Themes use the stock font stack and download no extra fonts.

## Product Principles

1. The reader's content wins over the chrome in every theme.

2. A theme is a stylesheet and optional components over stock, never a fork.

3. Whatever a built in theme needs, a consumer can reach the same way.

## Accessibility & Inclusion

1. WCAG AA contrast for body text and controls in every theme, over any translucent surface.

2. Themes honor `prefers-reduced-transparency` and `prefers-contrast` with solid surfaces, and `prefers-reduced-motion`.
