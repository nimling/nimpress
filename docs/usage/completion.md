---
title: completion
order: 9
tags: cli
description: Print or install the shell completion for bash, zsh, fish, or powershell.
---

`nimpress completion` gives the shell the commands, the subcommands, and the flags so the tab key completes them.

## Usage

```bash
nimpress completion zsh
nimpress completion --auto
nimpress completion --auto --skill
nimpress completion bash --auto
```

With a shell name and no `--auto` it prints the completion script to stdout. `--auto` detects the shell from `$SHELL` when none is named, writes a nimpress owned file under `~/.config/nimpress/`, and adds one source line to the shell rc file when it is missing. `--skill` installs the agent skill in the same run.

## Options

| Option | Description |
|---|---|
| `<shell>` | `bash`, `zsh`, `fish`, or `powershell`. Detected from `$SHELL` with `--auto` when omitted. |
| `--auto` | Write the script and the rc line instead of printing. |
| `--skill` | Install the agent skill too. |
