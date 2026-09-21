---
title: dev
order: 2
tags: cli
description: Serve the site and every component harness while you write.
---

`nimpress dev` starts a local web server to preview your documentation site as you write. This allows you to view your site in a web browser without deploying it to a remote server. It is the command the cli runs with no arguments.

## Usage

```bash
nimpress dev
nimpress dev --view
```

This starts the docs server and one harness server per configured component system, prints their urls, and stays running. The page you edit rebuilds and reloads in the browser as you save. A component under a component page triggers the schema upsert of `modules update` on every change, and the vite cli shortcuts are bound in the terminal.

With `--view` the command serves the central docs site this repo publishes into instead of the site itself, with the pages marked `export:` overlaid at their mapped path, so you see them in place as you save. It is the same run as `nimpress view`, and that page describes how the docs site is found.

## Options

| Option | Description |
|---|---|
| `--view` | Serve the central docs site with this repo's exported pages in place. See [view](/usage/view). |

The port and every vite setting come from the `vite` block of the config, and each component system pins its harness port with `port` in its `modules` entry.
