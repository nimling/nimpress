---
title: view
order: 11
tags: cli, export
description: Preview the export folder of the repo you are in inside the central docs site it publishes to, reloading on every change.
---

`nimpress view` shows how the export folder of the repo you are in reads once the docs sync pipeline has mirrored it into the central docs site. It runs that site locally with your folder mounted at its mapped path, so what you see is the whole site with your pages in place, and a save in the folder reloads the page. It is the one command that needs no config in the repo it runs from, so it works from any repo the pipeline publishes.

## Usage

```bash
nimpress view
nimpress view --no-browser
nimpress view --docs-repo=nimling/docs-site
nimpress view --offline
```

View finds the docs site, fetches it into the cache, installs what it needs, resolves where your folder lands, and starts the docs server with your folder overlaid at that path. It opens the browser on your pages rather than on the site home, prints the url, and stays running. A repo with a nimpress config of its own runs `export` in watch mode underneath, so pages marked `export:` flow through the export folder into the preview as you save. A repo without one has the export folder as its authored content, and that folder is watched directly.

## How the docs site is found

1. View reads every workflow under `.github/workflows/` for the step that calls `docs-notify` and takes `docs-repo` and `export-dir` from it, resolving a value written as an `env` reference from the workflow's `env` block. A repo publishing into several docs sites yields one link per site, and view opens one tab per link.

2. When no workflow names a docs site, view asks for the repo url, http or ssh, and tries it. `--docs-repo` answers the question up front. A url that refuses the connection leads to a login, through the `gh` cli when it is installed and otherwise by naming the ssh key to use.

3. Every resolved link and the login method persist in the global config at `~/.nimpress/config.json`, created on first use, so the question is asked once per repo. Every later run reads the link from there.

4. The docs site is cloned once under `~/.tide/nimpress/sites/<owner>__<repo>/` and fetched on every run. `pnpm install` runs in that clone the first time and whenever its lockfile changes, and the site is served by the nimpress version it pins, so your pages render the way the published site will. Several repos publishing into the same site share one clone.

5. The mapped path comes from the docs site itself: `nimpress.sources.json` at its root merged with the `defaults` input of its receiver workflow, the source winning per field, the same rule the `docs-sync` action applies. See [Publishing a repo's docs to the central site](/actions).

## Options

| Option | Description |
|---|---|
| `--no-browser` | Print the url instead of opening a browser. |
| `--docs-repo=<repo>` | The docs site to preview in, as `owner/repo` or a url, when the workflows do not name it or you want another. Stored as the link for this repo. |
| `--export-dir=<folder>` | The export folder when no workflow names it, `.nimpress` by default. |
| `--target=<name>` | The export target whose pages flow through, when the repo has a nimpress config. Every marked page flows without it. |
| `--offline` | Serve from the cached clone without fetching. |

`nimpress cache clear` drops the links and the clones. See [cache](/usage/cache).
