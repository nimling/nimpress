---
title: init
order: 1
tags: cli
description: Scaffold the config, the content folder, and the agent guides.
---

`nimpress init` bootstraps a site in the current directory. It never overwrites a file that exists.

## Usage

```bash
nimpress init
nimpress init --json
```

This writes `nimpress.config.ts` with every field documented and commented out, so uncommenting is the whole setup; `--json` writes `nimpress.config.json` instead, with a `$schema` reference to the packaged `config.schema.json` so editors show the same descriptions. It creates the content folder with a home page when the folder is missing or empty, and writes `CLAUDE.md` and `AGENTS.md` pointing at the packaged rules under `node_modules/@nimtech/nimpress/.claude/rules/`.

## Options

| Option | Description |
|---|---|
| `--json` | Write `nimpress.config.json` instead of `nimpress.config.ts`. |
