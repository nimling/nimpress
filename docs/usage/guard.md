---
title: guard
order: 6
tags: cli, auth
description: Map the guarded bundle for upload and apply the returned mapping to the build.
---

`nimpress guard` finishes the gated build flow. The build constructs `guard.map.json` through the `auth.guard` function; these two commands hand the guarded files to the auth provider and take its answer back into the build.

## Usage

```bash
nimpress guard map
nimpress guard map --dist=dist --out=guard.map.json
nimpress guard apply --map=uploaded.json
```

Both read `access.json` from the build folder and fail with `[nimpress] guard: <path>/access.json not found, run a build first` when there is none.

1. `map` walks the guarded folder and records the path, the sha256, the size, the mime type, and the gates of every file into the mapping, ready for upload.

2. `apply` reads the mapping the asset host returned, writes the base url and the published asset list back into `access.json`, and removes both the guarded folder and `guard.map.json` from the build, so the public bundle ships no gated content.

The full flow is in [Auth](/auth).

## Options

| Option | Description |
|---|---|
| `--dist=<folder>` | The build folder instead of `paths.out`. |
| `--out=<file>` | Where `map` writes the mapping instead of `<dist>/guard.map.json`. |
| `--map=<file>` | The mapping the asset host returned. Required by `apply`. |
