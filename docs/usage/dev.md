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
```

This starts the docs server and one harness server per configured component system, prints their urls, and stays running. The page you edit rebuilds and reloads in the browser as you save. A component under a component page triggers the schema upsert of `modules update` on every change, and the vite cli shortcuts are bound in the terminal.

## Options

The command takes no options. The port and every vite setting come from the `vite` block of the config, and each component system pins its harness port with `port` in its `modules` entry.
