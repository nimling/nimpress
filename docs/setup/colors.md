---
title: Colors
order: 2
tags: Setup, Styling
description: The brand colors, the light and dark schemes, and the tokens every color goes through.
---

nimpress allows to change the color palette of your documentation site through configuration to fit your brand's identity. If you want to go beyond that, you can also define custom colors by overriding the tokens.

## Configuration

### Primary color

The primary color is used for text links, buttons, the active sidebar row, and every accent. Add the following lines to your configuration:

```json
{
  "brand": { "primary": "#CC785C", "primaryHover": "#B86A52" }
}
```

`primary` writes `--np-brand` and `primaryHover` writes `--np-brand-hover`.

### Color scheme

nimpress supports two color schemes: a light mode and a dark mode. The toggle in the header switches between them and remembers the choice, and the first visit follows the operating system preference. Nothing needs to be configured.

## Customization

### Custom colors

nimpress implements colors using CSS variables. Every token has a light and a dark value, so override the ones you want in the stylesheet named by the `css` config field, on `:root` for light and under `html.dark` for dark:

```css
:root {
  --np-bg: #ffffff;
  --np-text-primary: #18181b;
}
html.dark {
  --np-bg: #0b0f17;
  --np-text-primary: #f4f4f5;
}
```

The full token list is in [Theming](/theming).
