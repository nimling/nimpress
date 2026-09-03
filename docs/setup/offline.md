---
title: Offline usage
order: 12
tags: Setup
description: What works when the built site is opened from the file system, and what needs a server.
---

In order to build documentation and either offer it as a download or ship it with your product, nimpress can be built once and served from any folder. The site is static files, so a local server over the output folder runs it without a network.

## Usage

Build the site and serve the output folder with any static server:

```bash
nimpress build
pnpm dlx serve dist
```

Every page, the search index, the diagrams, and the component workshop bundles load from the folder.

## Limitations

nimpress is a single page app that loads its pages as modules, and browsers refuse modules from the `file://` scheme. Opening `dist/index.html` directly from the file system shows the shell and nothing else. Serve the folder over `http://`, from a local server or from the product that ships the documentation, and everything works; a `base` set to the folder the site lives under keeps every route right.
