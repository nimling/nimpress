---
title: build
order: 3
tags: cli
description: Emit the static site, the harness bundles, and the guarded bundles.
---

To build your documentation site, run `nimpress build`.

## Usage

```bash
nimpress build
```

This will generate the static site in the configured `paths.out`, with the default being `dist`: an `index.html` per route, a `404.html` at the root, `robots.txt`, `sitemap.xml`, `llms.txt`, and the assets. Then it builds a static harness bundle per component system into `<out>/<paths.modules>/<system>/`, skipping systems with `visibility: dev-only`, and lands gated pages in `<out>/<paths.guarded>/<bundle>/` with `access.json` and `guard.map.json` beside the site. `subscribe.map.json` records every changelog page with a subscribe control.

## Options

The command takes no options. Every folder it writes comes from the `paths` block, see [Basics](/setup/basics).

## Troubleshooting

If a build produces unexpected output, particularly after upgrading nimpress, run a clean build by removing the cache root first:

```bash
rm -rf node_modules/.nimpress
nimpress build
```

A build that fails on the `nimpress:chunk-cycle-guard` plugin prints each cycle as a chunk path with the source module behind it; the fix is a dynamic import in the shared module the cycle names, never a wider chunk.
