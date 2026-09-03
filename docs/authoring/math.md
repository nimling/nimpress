---
title: Math
order: 30
tags: Authoring, Markdown
description: Display and inline formulas rendered by katex as MathML.
---

KaTeX is a lightweight library that focuses on speed and simplicity. nimpress renders every formula with it as MathML in the browser, so no stylesheet and no fonts are loaded, and the katex code reaches only pages that carry math.

## Usage

### Use block syntax

Blocks must be enclosed in `$$...$$` on separate lines:

```md
$$
\frac{n!}{k!(n-k)!} = \binom{n}{k}
$$
```

### Use inline block syntax

Inline blocks must be enclosed in `$...$` with no space inside the dollar signs, so a price such as `$5` stays text:

```md
The mass energy equivalence $E = mc^2$ sits inside a sentence.
```

A site that writes dollar signs in prose turns the syntax off. Add the following lines to your configuration:

```json
{
  "math": false
}
```

See [Icons and math](/examples/icons-math) for every form rendered.


