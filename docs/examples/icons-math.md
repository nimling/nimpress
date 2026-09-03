---
title: Icons and math
status: new
order: 42
description: Lucide icons and emoji by shortcode, a custom icon from the site folder, and formulas rendered by katex.
---

Every icon form and both math forms nimpress renders, each followed by its source.

## Emojis

Ship it :rocket: and celebrate :tada:.

```md
Ship it :rocket: and celebrate :tada:.
```

## Icons

Wrap a value in braces :lucide-braces: or read the docs :lucide-book-open:. A custom icon from the site folder: :nim:.

```md
Wrap a value in braces :lucide-braces: or read the docs :lucide-book-open:. A custom icon from the site folder: :nim:.
```

## Icons with attributes

A large brand colored icon :lucide-heart:{.lg .brand} beside the text, and an unknown one :lucide-not-a-real-icon: stays as text.

```md
A large brand colored icon :lucide-heart:{.lg .brand} beside the text.
```

The `brand` class comes from the site stylesheet:

```css
.np-icon.brand {
  color: var(--np-brand);
}
```

## Display math

$$
\frac{n!}{k!(n-k)!} = \binom{n}{k}
$$

```md
$$
\frac{n!}{k!(n-k)!} = \binom{n}{k}
$$
```

## Inline math

The mass energy equivalence $E = mc^2$ sits inside a sentence, and a price of $5 stays a price.

```md
The mass energy equivalence $E = mc^2$ sits inside a sentence.
```
