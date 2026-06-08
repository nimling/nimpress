# Changelog renderer

Multiple markdown files collapse into one long changelog page when they share a `title` and live in the same folder, each with `type: changelog`. Each file is one release entry on the resulting page.

## Frontmatter

```yaml
---
title: Changelog
type: changelog
data:
  version: 1.4.2
  title: Booking calendars, code actions, full user management
  description: One short sentence summarising the release.
---
```

1. Top level `title` is the page heading and the grouping key. Every entry file in the same folder uses the exact same string.

2. `data.version` is required. Versions sort newest first, parsed as dot delimited numeric segments, with an optional leading `v`.

3. `data.title` is the per release headline rendered next to the version pill in the entry header.

4. `data.description` is one short sentence rendered under the header when the entry expands.

5. No `path` field. The route is derived from the folder the entries live in.

## File layout

```
docs/
└── solutions/
    └── bookable/
        └── changelog/
            ├── v1.4.0.md      data.version: 1.4.0
            ├── v1.4.1.md      data.version: 1.4.1
            └── v1.4.2.md      data.version: 1.4.2
```

All three files declare `title: Changelog` and `type: changelog`. The plugin groups them and produces one page mounted at `/solutions/bookable/changelog`. Filenames are arbitrary, the plugin reads `data.version`. Naming files after the version keeps the file tree readable.

## Rendered

1. The page H1 is the shared top level `title`.

2. Each entry is a row of `[version pill] [data.title] [chevron]`. The row is the toggle. Clicking expands the body; expanded body shows `data.description` followed by the markdown body.

3. The newest version is expanded by default. A direct hash like `/solutions/bookable/changelog#v1.4.2` expands that entry and scrolls to it on load.

4. The right rail TOC ("On this page") lists each version as `v1.4.2`, anchored to the same hash slug.

5. The left sidebar adds one child entry per version under the collection page, each linking to the hash anchor.

## Why this exists

Authors maintain one markdown file per release in version control. The reader sees one page with the full history. Reviewing a release diff is a clean PR adding a new file rather than mutating a long shared document.

## Reserved fields

`data.version`, `data.title`, and `data.description` are read by the renderer. Anything else under `data` is ignored by the renderer but available to consumers reading frontmatter from the page module.
