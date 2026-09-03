---
title: Create your site
order: 3
tags: Setup, Install
description: Bootstrap a site with one command, preview it as you write, and build it.
---

After you've installed nimpress, you can bootstrap your project documentation using the nimpress executable. Go to the directory where you want your project to be located and enter:

```bash
pnpm exec nimpress init
```

This creates `nimpress.config.ts` with every field documented and commented out, a `docs` folder with a home page, and the `CLAUDE.md` and `AGENTS.md` files that point an agent at the packaged authoring rules. `--json` writes `nimpress.config.json` instead. Nothing that already exists is overwritten.

## Configuration

nimpress comes with many configuration options that have sensible defaults, which allows to build a documentation site with almost no configuration. A config can be as small as a title:

```json
{
  "title": "Docs"
}
```

Every field is listed in [Basics](/setup/basics), and the pages under [Setup](/setup) walk through each group of options.

## Preview as you write

nimpress includes a web server, so you can preview your documentation site as you write. Start it with:

```bash
pnpm exec nimpress dev
```

Point your browser at the url the command prints. The server rebuilds the page you edit and reloads it in the browser as you save. Every component system in the config gets its own harness server beside the docs.

## Build your site

When you're finished editing, you can build a static site from your markdown files with:

```bash
pnpm exec nimpress build
```

The contents of the output folder, `dist` by default, can be copied to any static host. Run the checks before you build, so a broken page never reaches the host:

```bash
pnpm exec nimpress lint
```

[Publish your site](/get-started/publish-your-site) walks through the hosting flows.
