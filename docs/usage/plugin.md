---
title: plugin
order: 13
tags: cli
description: Install the Claude Code plugin that carries the nimpress skill and the nimpress mcp server.
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

## The mcp server

The plugin starts `nimpress mcp` in the project. It runs the `nimpress` the repo installs in `node_modules`, so the tools match the pinned version. A repo without the package runs the published one through `pnpm dlx`.

Every command becomes a tool named after it, `lint`, `build`, `modules_update`, `export`, `guard_map`. Each tool takes `args` for positional arguments, `flags` for the command flags by name, and `cwd` for a site that sits below the project root. `dev`, `view`, and `modules_dev` keep running in the background and return their pid with the first output, and `stop` ends them by that pid.

## Options

| Option | Description |
|---|---|
| `--project` | Install into the project settings of the current directory instead of the user settings. |
