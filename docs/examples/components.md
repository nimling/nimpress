---
title: Component workshop
order: 35
description: A Vue component library presented live inside the docs, from an empty config to a page with controls and stories.
---

This walkthrough takes a library that already exists and gives it a workshop page per component: rendered live, props driven by controls, stories in the sidebar.

## The result

```
docs/components/Forms/Button/
├── index.md            the page
├── schema.json         props, slots, events, mocks
├── default.story.tsx   the entry story
└── With_Icon.story.tsx a second story
```

## 1. Declare the system

One system per library, in `nimpress.config.ts`.

```ts
import { defineConfig } from '@nimtech/nimpress/plugin'

export default defineConfig({
  title: 'Docs',
  modules: [
    {
      name: 'forms',
      framework: 'vue',
      source: './src/components',
      package: '@my-org/forms',
      port: 6161,
      css: ['./src/assets/tokens.css'],
      setup: './docs/components/setup.ts',
      harness: './docs/components/harness.vue'
    }
  ]
})
```

`source` resolves components from the repo while you work on them. `package` is the fallback and the mode the export pipeline rewrites pages into. `port` pins the harness dev server, so pin distinct ports when several repos run side by side.

## 2. Bootstrap the app

The harness mounts each component bare. Anything the library needs around it is declared, never discovered.

```ts
import { createPinia } from 'pinia'
import Toaster from '../../src/components/Toaster.vue'

export default {
  install(app) {
    app.use(createPinia())
  },
  companion: Toaster
}
```

`install` runs on every created app before mount. `companion` renders beside every story, which is where an overlay or toast root belongs.

## 3. Compose the frame

The harness is built from primitives, so you arrange it rather than configure it.

```vue
<script setup lang="ts">
import {
  ComponentHarness,
  ComponentHarnessEffects,
  ComponentHarnessOverlay,
  ComponentStory
} from '@nimtech/nimpress/harness/vue'
</script>

<template>
  <ComponentHarness>
    <ComponentHarnessEffects>
      <div class="frame">
        <ComponentStory />
      </div>
    </ComponentHarnessEffects>
    <ComponentHarnessOverlay />
  </ComponentHarness>
</template>

<style scoped>
.frame { padding: 24px; }
</style>
```

`ComponentStory` is where nimpress mounts the component under test. Omit the `harness` config key entirely and you get the default composition.

## 4. Scaffold the page

```bash
pnpm exec nimpress modules create Button --system=forms
```

That writes `index.md`, `default.story.tsx`, and a `schema.json` seeded from the component's types.

```md
---
title: Button
type: component
data:
  system: forms
  component: Button
---

## Usage

```ts
import { Button } from '@my-org/forms'
```

A button. Use it for the primary action in a form. The `label` slot overrides the text, and `click` fires with the native event.
```

The live frame and the source CLAUDE.md render below the body automatically. Neither is written in the markdown.

## 5. Author the schema

The schema is the read path. Controls, validation, and mock selection all come from it, so defaults, enums, descriptions, and mocks are authored here rather than in the component.

```json
{
  "properties": {
    "label": { "type": "string", "default": "Save", "description": "The button text.", "mock": "mockWords" },
    "variant": { "type": "string", "enum": ["primary", "secondary", "ghost"], "default": "primary", "description": "Visual weight." },
    "disabled": { "type": "boolean", "default": false, "description": "Blocks interaction." }
  },
  "required": ["label"],
  "slots": { "icon": { "description": "Rendered before the label." } },
  "emits": { "click": { "description": "The native click event." } }
}
```

After changing the component types, pull the shape back in:

```bash
pnpm exec nimpress modules update Button --system=forms
```

New props, slots, and events are added, changed types refresh, authored fields are never overwritten, and a member that vanished from the source is flagged rather than dropped.

## 6. Write the stories

A value story carries data. The controls seed from it.

```tsx
import { vueStory } from '@nimtech/nimpress/story'

export default vueStory({
  name: 'Default',
  props: { label: 'Save', variant: 'primary' }
})
```

A render story runs its own markup, which is what you want for anything with layout or fixture data.

```tsx
import { vueStory } from '@nimtech/nimpress/story'
import Button from '../../../../src/components/Button.vue'

export default vueStory({
  name: 'In a form',
  render: () => ({
    components: { Button },
    setup: () => ({ busy: false }),
    template: `
      <form style="display:grid;gap:12px;width:320px">
        <input placeholder="Email" />
        <Button label="Sign up" :disabled="busy" />
      </form>
    `
  })
})
```

`name`, `props`, and `slots` are read by parsing the file as text, never by running it, so those values must be inline literals. A story that needs an import uses `render`, which runs in the browser where imports resolve.

## 7. Run it

```bash
pnpm exec nimpress dev
```

The docs and every harness server start together. Editing a component under a page reruns the schema upsert and warns about props without a description and types too opaque to build a control from.

## 8. Check it before shipping

```bash
pnpm exec nimpress modules lint --system=forms
```

That checks framework purity, that every page has at least one story, that exactly one schema file sits beside each `index.md`, that value story props match the schema, and that the schema still matches the component source.

## Embedding one elsewhere

Any page can render a component inline through the same harness:

```markdown
:::component {"component":"Button","props":{"label":"Save"},"height":"12em"}
:::
```

The full contract, every control kind, the mock functions, and the rest of the `nimpress modules` commands are in [Component modules](/modules).
