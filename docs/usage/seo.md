---
title: seo
order: 10
tags: cli, SEO
description: Report the search and robot metadata of every page, and write the generated fields into the frontmatter.
---

`nimpress seo` shows what the build emits for every page and, with `--write`, turns the generated values into authored frontmatter.

## Usage

```bash
nimpress seo
nimpress seo --write
nimpress seo --out=reports/seo.json
```

One line per page prints the route, the keyword count, the description length, whether the robots directive carries `noai`, and whether the values come from the frontmatter or from the generator. The full set lands in `seo.map.json`. With `seo.auto` off in the config the report shows the authored values alone. See [SEO and social cards](/seo).

## Options

| Option | Description |
|---|---|
| `--write` | Put the generated keywords and description into each page's frontmatter under `meta`, only where the page has none. |
| `--out=<file>` | Where the map is written instead of `seo.map.json`. |
