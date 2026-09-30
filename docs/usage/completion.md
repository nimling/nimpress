---
title: completion
order: 9
tags: cli
description: Install the nimpress shell command and its completion, or print the completion for bash, zsh, fish, or powershell.
---

`nimpress completion` gives the shell the `nimpress` command and the commands, the subcommands, and the flags so the tab key completes them.

## Usage

```bash
pnpm dlx @nimtech/nimpress completion --auto --skill
nimpress completion zsh
nimpress completion --auto
nimpress completion --auto --skill
nimpress completion bash --auto
```

With a shell name and no `--auto` it prints the completion script to stdout. `--auto` detects the shell from `$SHELL` when none is named, writes a nimpress owned file under `~/.config/nimpress/`, and writes the `nimpress` shell function and the completion wiring into one managed block of the shell rc file. `--skill` installs the agent skill in the same run.

The `nimpress` function runs `node_modules/.bin/nimpress` when the current folder has one, so a repo that pins nimpress runs its own version. Everywhere else it runs the latest release through `pnpm dlx`, which installs nimpress in a folder of its own. That is how nimpress runs outside a repo. Never install it with `pnpm add -g`: the global folder is one shared project, and another global tool's Vite ends up under nimpress.

## Options

| Option | Description |
|---|---|
| `<shell>` | `bash`, `zsh`, `fish`, or `powershell`. Detected from `$SHELL` with `--auto` when omitted. |
| `--auto` | Write the script, the `nimpress` function, and the rc block instead of printing. |
| `--skill` | Install the agent skill too. |
