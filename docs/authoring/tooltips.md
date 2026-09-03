---
title: Tooltips
order: 34
tags: Authoring, Markdown
description: Tooltips on titled links, footnote references, abbreviations, and every glossary term.
---

Technical documentation often incurs the usage of many acronyms, which may need additional explanation, especially for new users of your project. For these matters, nimpress uses a combination of a glossary page and improved tooltips to enable site-wide glossaries.

## Configuration

### Improved tooltips

nimpress replaces the browser's rendering logic for the `title` attribute with beautiful little tooltips, positioned beside the element and flipped when there is no room. They are on without configuration and show on hover and on focus.

## Usage

### Add a tooltip

The markdown syntax allows to specify a title for each link, which renders as a tooltip:

```md
[Hover me](https://example.com "I'm a tooltip!")
```

Footnote references show the footnote text the same way.

### Add abbreviations

Abbreviations can be defined by using a special syntax similar to URLs and footnotes, starting with a `*` and immediately followed by the term or acronym to be associated in square brackets. They apply to the page they are written on:

```md
The HTML specification is maintained by the W3C.

*[HTML]: Hyper Text Markup Language
*[W3C]: World Wide Web Consortium
```

### Add a glossary

Terms that every page should explain go on the `type: glossary` page as one definition list. The first occurrence of a term in each paragraph of every other page renders as an abbreviation with the definition as its tooltip. See [Glossary page](/page-types/glossary) and [Glossary](/glossary).
