---
title: cache
order: 12
tags: cli
description: Clear the links and the docs site clones that view keeps, and the cache root of the repo you are in.
---

`nimpress cache clear` removes what `view` keeps between runs, and with `--local` the cache root of the repo you are in.

## Usage

```bash
nimpress cache clear
nimpress cache clear --links
nimpress cache clear --sites
nimpress cache clear --local
```

With no flag it clears the links in `~/.nimpress` and the docs site clones under `~/.tide/nimpress/sites/`. The next `view` resolves the docs site again, asks again where it cannot deduce it, and clones afresh. `--local` clears `paths.cache` of the repo you are in, `node_modules/.nimpress` by default, and needs a config there.

## Options

| Option | Description |
|---|---|
| `--links` | Clear only the links and login methods stored in `~/.nimpress`. |
| `--sites` | Clear only the docs site clones. |
| `--local` | Clear only `paths.cache` of the current repo. |
