---
title: export
order: 5
tags: cli, export
description: Collect the pages marked for a target into the handoff folder of the docs sync pipeline.
---

`nimpress export` collects every page whose frontmatter carries `export: <target>` into an export tree for the docs sync pipeline. It is the command the nimpress GitHub actions run.

## Usage

```bash
nimpress export --target=central
nimpress export --target=central --out=.nimpress
```

Every page carrying `export: <target>`, or `export: true` for every target, is copied together with the whole folder it sits in into `paths.export`, `.nimpress` by default. Component pages are rewritten to package mode: the `export:` header and the `file:` override drop, and the package version from the repo `package.json` stamps in. See [Publishing a repo's docs to the central site](/actions) for the pipeline around it.

## Options

| Option | Description |
|---|---|
| `--target=<name>` | The target whose pages are collected. Required. |
| `--out=<folder>` | The folder to fill instead of `paths.export`. |
