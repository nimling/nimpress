---
title: plugin
order: 13
tags: cli
description: Install the Claude Code plugin that carries the nimpress skill and the nimpress mcp server, or the plugin a package ships.
---

`nimpress plugin` installs the nimpress plugin for Claude Code. The plugin carries the skill that teaches the cli and an mcp server that exposes every command as a tool, so an agent in any repo drives nimpress without a skill copied into place.

## Usage

```bash
nimpress plugin put
nimpress plugin put --project
```

`put` adds the `nimling/nimpress` marketplace and installs the `nimpress` plugin from it. It runs the `claude` cli, so Claude Code must be installed. Without a flag both land in the user settings. `--project` writes them into the project settings of the current directory, so everyone who opens the repo is offered the plugin.

The same result comes from Claude Code directly:

```bash
claude plugin marketplace add nimling/nimpress
claude plugin install nimpress@nimpress
```

## A plugin a package ships

```bash
nimpress plugin put @nimling/components-nimtech
nimpress plugin put @nimling/components-nimtech --project
nimpress plugin put @nimling/components-nimtech --check
```

With a package name `put` installs the Claude plugin that package ships. The package is read from `node_modules` at or above the current directory and carries its plugin in a `plugin` folder with `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`. The folder is copied to `~/.<plugin name>/plugin`, stamped with the package version and a hash of its files, added as a marketplace and installed, or updated when it is already installed.

`--check` writes nothing. It prints the installed version when it is the one the package carries, and exits non zero when the plugin is missing or behind, so it tells when a new package version needs `put` again.

## The mcp server

The plugin starts `nimpress mcp` in the project. It runs the `nimpress` the repo installs in `node_modules`, so the tools match the pinned version. A repo without the package runs the published one through `pnpm dlx`.

Every command becomes a tool named after it, `lint`, `build`, `modules_update`, `export`, `guard_map`. Each tool takes `args` for positional arguments, `flags` for the command flags by name, and `cwd` for a site that sits below the project root. `dev`, `view`, and `modules_dev` keep running in the background and return their pid with the first output, and `stop` ends them by that pid.

## Options

| Option | Description |
|---|---|
| `--project` | Install into the project settings of the current directory instead of the user settings. |
| `--check` | With a package, say whether the installed plugin is the one the package carries, and install nothing. |
