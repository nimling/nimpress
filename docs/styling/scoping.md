---
title: Scoping
order: 61
tags: Setup, Styling
description: Style a component site wide, a page and its subtree, or one component on one page, each from a file whose name says where it applies.
---

Every visual choice in nimpress goes through a token, every element on rendered chrome carries a stable `np-` class, and every stylesheet nimpress ships sits in the `nimpress` cascade layer, so a site rule wins without `!important`. Scoping is where that rule lives, and the file name says exactly how far it reaches.

## The three scopes

### Per component, site wide

A file under `styles/` in the content folder, named after a component class root, applies to that component on every page. `docs/styles/tag.css` wraps its rules in `@scope (.np-tag)`, so `:scope` is the tag pill and a bare selector is a descendant of it:

```css
:scope {
  letter-spacing: 0.04em;
}
```

Lint checks the file name against the class roots, `callout`, `code`, `tabs`, `card`, `feature`, `action`, `hero`, `tag`, `footer`, and the rest, one per documented area.

### Per page

A stylesheet named after a markdown file loads only while that page and its subpages are open. `guide/index.css` beside `guide/index.md` applies across `/guide`, and a leaf page's stylesheet applies to itself alone. The rules are written as normal selectors and apply only inside that subtree.

### Per component, per page

A file named `<page>.<component>.css` beside the page scopes its rules to that component on that page. `examples/callouts.callout.css` beside `examples/callouts.md` wraps its rules in `@scope (.np-callout)` and loads only on that route:

```css
:scope {
  border-style: dashed;
}
```

## Extra files

A `styles` list in the frontmatter names further stylesheets for the page, relative to the markdown file, for a rule set several pages share:

```yaml
---
styles:
  - ../shared/_wide-tables.css
---
```

A shared file is named with a leading underscore so lint treats it as inert, the same rule story assets follow.

## Browsers

`@scope` needs Chrome 118, Edge 118, Safari 17.4, or Firefox 128. A browser without it ignores the component scoped files and keeps the page and site files, so the page never breaks, it only loses the narrowest rules.

## The order of reach

1. Tokens. Change a custom property and every component that reads it follows. See [Theming](/theming).

2. Site wide by class, from the stylesheet named in the `css` config field, or by component from `styles/<component>.css`.

3. A page and its subtree, from `<page>.css`.

4. One component on one page, from `<page>.<component>.css`.

A narrower file loads after a wider one, so the narrowest rule wins at equal specificity.
