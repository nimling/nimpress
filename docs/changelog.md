# Changelog renderer

Multiple markdown files collapse into one long changelog page when they share a `path` and have `type: changelog`.

## Frontmatter

```yaml
---
title: 1.2.0 cookie refresh
type: changelog
path: /docs/changelog
data:
  version: 1.2.0
---
```

Each file is one entry. `data.version` is the version label that headers the entry. Sorting is parsed numerically, dot delimited, with an optional leading `v`. Newest version first.

## File layout

```
docs/
└── changelog/
    ├── 1-0-0.md       data.version: 1.0.0
    ├── 1-1-0.md       data.version: 1.1.0
    └── 1-2-0.md       data.version: 1.2.0
```

All three files declare the same `path: /docs/changelog` and `type: changelog`. The plugin groups them and produces one page mounted at that path.

## Rendered

Each entry is a collapsible card. The first entry expands by default. An Expand all / Collapse all action sits in the header.

The page title is the title of the highest version entry.

## Why this exists

Authors maintain one markdown file per release in version control. The reader sees one page with the full history. Reviewing a release diff is a clean PR adding a new file rather than mutating a long shared document.

## Reserved fields

`data.version` is required for sorting. Anything else under `data` is ignored by the renderer but available to consumers reading frontmatter from the page module.
