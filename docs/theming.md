---
title: Theming
order: 1
sidebar:
  name: Styling
---

Nimpress styles flow through CSS custom properties. Override the ones you want in your own stylesheet, no fork required.

## Tokens

Tokens live in `src/styles/tokens.css`. They split into:

1. Brand: `--np-brand`, `--np-brand-hover`, `--np-brand-soft`.

2. Surface: `--np-bg`, `--np-bg-surface`, `--np-bg-card`, `--np-bg-sidebar`, `--np-bg-code-block`.

3. Text: `--np-text-primary`, `--np-text-secondary`, `--np-text-muted`, `--np-text-faint`, `--np-text-code-block`.

4. Borders: `--np-border`, `--np-border-strong`, `--np-divider`.

5. Tables: `--np-table-header-bg`, `--np-table-row-alt`, `--np-table-row-hover`.

6. Geometry: `--np-radius-sm`, `--np-radius-md`, `--np-radius-lg`, `--np-radius-pill`, `--np-header-height`, `--np-sidebar-width`, `--np-toc-width`, `--np-content-max`.

7. Typography: `--np-font-mono`.

Every token has a light and a dark value. The dark theme overrides them under `:root[data-theme="dark"]`.

## Overriding tokens

Add a stylesheet in your consumer app and import it after `@nimling/nimpress/style.css`:

```css
:root {
  --np-brand: #2563eb;
  --np-brand-hover: #1d4ed8;
}

:root[data-theme="dark"] {
  --np-bg: #0b0f17;
  --np-bg-card: #11161f;
}
```

## Overriding component CSS

Every component carries a stable `np-` prefixed class on its root and key children. Target them directly:

```css
.np-callout-tip {
  border-left-color: var(--np-brand);
}

.np-changelog-version {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

These classes are part of the public API and will not be renamed without a major version bump.

## Brand color via config

`createNimpressApp` accepts a `brand` config. The framework writes the values onto `--np-brand` and `--np-brand-hover` so consumers can ship a single source of truth.

```ts
createNimpressApp({
  title: 'Docs',
  brand: { primary: '#CC785C', primaryHover: '#B86A52' },
  // …
})
```

## Tailwind preset

`@nimling/nimpress/tailwind` exports a preset matching the token palette. Extend it in your `tailwind.config.ts` to author utilities that match the framework chrome.
