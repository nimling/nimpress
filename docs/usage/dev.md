---
title: dev
order: 2
tags: cli
description: Serve the site and every component harness while you write.
---

`nimpress dev` starts a local web server to preview your documentation site as you write. This allows you to view your site in a web browser without deploying it to a remote server. It is the command the cli runs with no arguments.

## Usage

```bash
nimpress dev
nimpress dev --view
```

This starts the docs server and one harness server per configured component system, prints their urls, and stays running. The page you edit rebuilds and reloads in the browser as you save. A component under a component page triggers the schema upsert of `modules update` on every change, and the vite cli shortcuts are bound in the terminal.

With `--view` the command serves the central docs site this repo publishes into instead of the site itself, with the pages marked `export:` overlaid at their mapped path, so you see them in place as you save. It is the same run as `nimpress view`, and that page describes how the docs site is found.

## Options

| Option | Description |
|---|---|
| `--view` | Serve the central docs site with this repo's exported pages in place. See [view](/usage/view). |

The port and every vite setting come from the `vite` block of the config, and each component system pins its harness port with `port` in its `modules` entry.

## Run cli commands from a page

The dev server runs cli commands for a page or a component, the site and every component workshop harness alike, so a local tool such as `git` or `claude` can answer from the site while you work. It answers only requests from localhost, and a static build carries neither the command server nor the client, see [Commands in a static build](#commands-in-a-static-build). Nothing runs until the config allows it:

```json
{
  "commands": {
    "allow": ["git status", "git log **", "claude -p --model *"]
  }
}
```

| `allow` | Effect |
|---|---|
| `none` | The default. Every command is refused. |
| `all` | Any command runs. |
| a list | Only the entries it names run. The first word is the command and every further word matches one argument: `*` matches any characters inside it, and a trailing `**` matches any remaining arguments. `git status` allows exactly that, `git log **` allows `git log` with any arguments. |

A command outside the list is refused with `<command> is not in commands.allow`. Commands run in the site root with the dev server's environment, and the process is stopped when the page drops the request.

`postCommand` from `@nimtech/nimpress/commands` calls one and resolves with its exit code and output once it exits. `stdin` is written to the command and closed:

```js
import { postCommand } from '@nimtech/nimpress/commands'

const { code, stdout, stderr } = await postCommand('git', { args: ['status'] })
const reply = await postCommand('claude', { args: ['-p', '--model', 'haiku'], stdin: 'Name this page in five words' })
```

Pass `onLine` to listen instead: every line of stdout and stderr arrives as it is written, and the promise still resolves with the exit code and the collected output. `signal` takes an `AbortSignal` that stops the command. In a Vue component:

```vue
<script setup>
import { ref } from 'vue'
import { commandsEnabled, postCommand } from '@nimtech/nimpress/commands'

const lines = ref([])
const code = ref(null)

async function run() {
  lines.value = []
  const result = await postCommand('git', { args: ['log', '--oneline', '-20'], onLine: (line) => lines.value.push(line) })
  code.value = result.code
}
</script>

<template>
  <template v-if="commandsEnabled">
    <button @click="run">Log</button>
    <pre>{{ lines.join('\n') }}</pre>
  </template>
</template>
```

Both go to `POST /__nimpress/command` with a json body of `command`, `args`, `stdin`, and `stream`. Without `stream` it answers `{ "data": { "code", "stdout", "stderr" } }`; with `stream: true` it answers newline delimited json, one `{ "stream", "line" }` per line and a final `{ "code" }`. A refusal answers 403 with `{ "error" }`.

### Commands in a static build

Commands exist only while `nimpress dev` serves the site. In `nimpress build` and in a component build the plugin swaps `@nimtech/nimpress/commands` for a module where `commandsEnabled` is `false` and `postCommand` rejects with `commands run only under nimpress dev, a static build has no command server`. The client and the `/__nimpress/command` route never reach the static output.

Put every command button, panel, and call behind `commandsEnabled`. It is a constant in the build, so the bundler drops the guarded markup and everything only it calls, and the published page shows nothing of it. In Svelte:

```svelte
<script>
  import { commandsEnabled, postCommand } from '@nimtech/nimpress/commands'

  let status = $state('')

  async function run() {
    status = (await postCommand('git', { args: ['status'] })).stdout
  }
</script>

{#if commandsEnabled}
  <button onclick={run}>Status</button>
  <pre>{status}</pre>
{/if}
```

In Vue the same guard is `v-if="commandsEnabled"`, as in the example above, and in plain JavaScript `if (commandsEnabled) { ... }`. A call left unguarded fails the build: when `postCommand` survives into the output, `nimpress build` and the component build stop with `postCommand reaches the static build from <files>` naming the modules that import it, so nothing unguarded is ever published.
