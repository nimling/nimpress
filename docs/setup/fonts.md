---
title: Fonts
order: 3
tags: Setup, Styling
description: The regular and the monospaced font, and how to load one of your own.
---

nimpress makes it easy to change the typeface of your project documentation. The system font stack ships by default, so nothing loads from a third party, and a font of your own is one stylesheet away.

## Configuration

### Regular font

The regular font is used for all body copy, headlines, and essentially everything that does not need to be monospaced. It comes from the `font-family` on `body`, which the site stylesheet overrides:

```css
:root {
  --np-font-sans: "Inter", system-ui, sans-serif;
}
body {
  font-family: var(--np-font-sans);
}
```

### Monospaced font

The monospaced font is used for code blocks and can be configured separately through the `--np-font-mono` token:

```css
:root {
  --np-font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

## Customization

### Additional fonts

If you want to load a font from your own assets, add the corresponding `@font-face` definition to the stylesheet named by the `css` config field, with the file under `assetsDir`:

```css
@font-face {
  font-family: "Inter";
  src: url("/assets/fonts/inter.woff2") format("woff2");
  font-display: swap;
}
```

Fonts you self host stay under your data privacy rules; nothing in nimpress loads a font from a remote host.
