---
title: skill
order: 8
tags: cli
description: Hand out the agent skill that teaches the cli, and install it for a machine or a project.
---

`nimpress skill` prints or installs the skill document an agent reads to drive the cli.

## Usage

```bash
nimpress skill get
nimpress skill put
nimpress skill put --project
```

`get` prints the skill document to stdout. `put` writes it to `~/.claude/skills/nimpress/SKILL.md`, or to `.claude/skills/nimpress/SKILL.md` under the current directory with `--project`, and prints the path it wrote.

## Options

| Option | Description |
|---|---|
| `--project` | Install the skill under the current directory instead of the home folder. |
