---
title: Footnotes
order: 31
tags: Authoring, Markdown
description: Footnote references and content, rendered below the page and as a tooltip on the reference.
---

Footnotes are a great way to add supplemental or additional information to a specific word, phrase, or sentence without interrupting the flow of a document. nimpress provides the ability to define, reference and render footnotes.

## Configuration

### Footnote tooltips

nimpress renders every footnote as an inline tooltip on its reference, so the user can read the footnote without leaving the context of the document. It is on without configuration.

## Usage

### Adding footnote references

A footnote reference must be enclosed in square brackets and must start with a caret `^`, directly followed by an arbitrary identifier, which is similar to the standard markdown link syntax:

```md
Lorem ipsum[^1] dolor sit amet, consectetur adipiscing elit.[^2]
```

### Add footnote content

The footnote content must be declared with the same identifier as the reference. It can be inserted at an arbitrary position in the document and is always rendered at the bottom of the page.

#### on a single line

Short footnotes can be written on the same line:

```md
[^1]: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
```

#### on multiple lines

Paragraphs can be written on the next line and must be indented by four spaces:

```md
[^2]:
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla et euismod
    nulla. Curabitur feugiat, tortor non consequat finibus, justo purus auctor
    massa, nec semper lorem quam in massa.
```

See [Formatting and images](/examples/formatting) for a rendered footnote.
