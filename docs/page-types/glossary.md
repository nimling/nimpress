---
title: Glossary page
order: 12.9
tags: Page types
description: One definition list that defines the terms of the site and feeds a tooltip wherever a term occurs.
---

Technical documentation often incurs the usage of many acronyms, which may need additional explanation, especially for new users of your project. For these matters, nimpress uses a combination of a glossary page and improved tooltips to enable site-wide glossaries. A `type: glossary` page is one definition list, and every term in it gets a dotted underline and a tooltip wherever it occurs in the prose of any other page. [Glossary](/glossary) is this site's.

## Frontmatter

```yaml
---
title: Glossary
type: glossary
description: The terms this documentation uses.
---

Prose above the list.

Frontmatter
: The YAML block at the top of a markdown file.

Token
: A CSS custom property with a light and a dark value.
---
```

1. The body is one definition list, `term` then `: description`, the shape [Definition lists](/extensions/definition-lists) documents. Lint refuses a body without one and refuses a second glossary page in a site.

2. Every term gets an anchor, `/glossary#term-frontmatter`, and the right rail lists the terms. With more than twenty terms a letter index renders above the list.

3. The first occurrence of a term in each paragraph of every other page renders as an abbreviation with the definition as its tooltip. Headings, links, and code stay untouched, and the glossary page itself is not marked.

## Usage

### Add a tooltip

When improved tooltips are enabled, nimpress replaces the browser's rendering logic for the `title` attribute with beautiful little tooltips. They are always on. The markdown syntax allows to specify a title for each link, which renders as a tooltip on hover and on focus:

```md
[Hover me](https://example.com "I'm a tooltip!")
```

Footnote references get the same tooltip showing the footnote text, so the reader sees it without leaving the paragraph.

### Add abbreviations

Abbreviations can be defined by using a special syntax similar to URLs and footnotes, starting with a `*` and immediately followed by the term or acronym to be associated in square brackets. They apply to the page they are written on:

```md
The HTML specification is maintained by the W3C.

*[HTML]: Hyper Text Markup Language
*[W3C]: World Wide Web Consortium
```

### Add a glossary

Terms that every page should explain go on the glossary page instead of being repeated on each page. Write them there once as a definition list, and every page picks them up.

## Restyling

The abbreviation, the tooltip, the letter index, and the term anchors carry documented classes. See [Prose and markdown styling](/styling/prose) and [Page types styling](/styling/page-types).
