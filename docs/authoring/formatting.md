---
title: Formatting
order: 27
tags: Authoring, Markdown
description: Highlights, insertions, deletions, sub and superscripts, and keyboard keys.
---

nimpress provides support for several HTML elements that can be used to highlight sections of a document or apply specific formatting. Highlighting, insertion, deletion, sub and superscripts, and keyboard keys are on without configuration.

## Usage

### Highlight text

Text can be highlighted with a simple syntax, which is more convenient than directly using the corresponding `mark`, `ins`, and `del` HTML tags:

```md
- ==This was marked==
- ^^This was inserted^^
- ~~This was deleted~~
```

### Sub- and superscripts

Text can be sub- and superscripted with a simple syntax, which is more convenient than directly using the corresponding `sub` and `sup` HTML tags:

```md
- H~2~O
- A^T^A
```

### Add keyboard keys

Keyboard keys can be rendered with a simple syntax. Consecutive keys are separated by a plus sign, and names such as `ctrl`, `cmd`, `shift`, `enter`, and `esc` render as their glyphs:

```md
++ctrl+alt+del++
```

