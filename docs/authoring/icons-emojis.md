---
title: Icons and emojis
order: 29
tags: Authoring, Markdown
description: Lucide icons and emoji by shortcode, custom icons from a folder, and colors and animations on them.
---

One of the best features of nimpress is the possibility to use more than 2,000 icons and thousands of emojis in your project documentation with practically zero additional effort. Moreover, custom icons can be added and used in your configuration and documents.

## Usage

### Use emojis

Emojis can be integrated in markdown by putting the shortcode of the emoji between two colons:

```md
:rocket:
```

### Use icons

Icons can be used similar to emojis, by referencing a lucide icon name with the `lucide-` prefix. The svg is inlined at build time inside a `np-icon` span, so it follows the text color and size:

```md
:lucide-braces:
```

A site adds its own icons by pointing the `icons` config field at a folder of svg files. `:name:` then resolves to `<icons>/name.svg`. Add the following lines to your configuration:

```json
{
  "icons": "./assets/icons"
}
```

The same shortcode works in `sidebar.icon` and in the footer `social` icons. An unknown shortcode stays as text, and a `lucide-` name that does not exist prints a warning during the build.

## Customization

### with colors

Custom CSS classes can be added to icons in braces after the shortcode, and a rule in the site stylesheet colors them:

```md
:lucide-heart:{.brand}
```

```css
.np-icon.brand {
  color: var(--np-brand);
}
```

The `lg` class ships with nimpress and grows the icon to one and a half times the text size.

### with animations

Similar to adding colors, it's just as easy to add animations to icons by using an additional style sheet, defining a `@keyframes` rule and adding a dedicated CSS class to the icon:

```css
@keyframes heart {
  0%, 40%, 80%, 100% { transform: scale(1); }
  20%, 60% { transform: scale(1.15); }
}
.np-icon.heart {
  animation: heart 1000ms infinite;
}
```

