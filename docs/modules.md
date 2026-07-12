# Component modules

The component workshop: present a component library inside a nimpress site with live rendering, controls, stories, and docs per component. One system per library, vue and svelte both first class, each system rendered through an isolated iframe harness so the docs app and the components never share a runtime.

## Mental model

1. A system is one component library: a framework, a source tree or a released package, and the css it needs.

2. A component page is a folder holding one `type: component` md file. The folder is the sidebar parent; the docs page and the stories are its children.

3. A story is a `.story.ts` file beside the page: either a value story, props the controls can drive, or an executable story carrying its own render function.

4. The harness is a per system vite server in dev and a static bundle in build, always reached same origin under `/_components/<system>/<Component>/`.

## Configure a system

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from '@nimling/nimpress/plugin'

export default defineConfig({
  title: 'Nimtech Components',
  contentDir: 'docs',
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  },
  modules: {
    systems: {
      nimtech: {
        framework: 'vue',
        source: './src/components',
        package: '@nimling/components-nimtech',
        port: 6161,
        css: ['./src/assets/style.css']
      }
    }
  }
})
```

1. `framework`: `vue` or `svelte`. Vue systems need `@vitejs/plugin-vue` installed in the consumer; the svelte plugin ships with nimpress.

2. `source`: local component tree. Components resolve as `<source>/<Name>/<Name>.<ext>` or `<source>/<Name>.<ext>`, with `data.file` in the page frontmatter as the explicit override for any other layout, including paths outside the source root.

3. `package`: the released npm package. When a component does not resolve from source, the harness imports it as a named export from this package and the props schema parses from the package `d.ts`. A page can override with its own `data.package`, which is how a showcase system presents components from several packages, `primevue` beside your own.

4. `css`: sheets loaded inside the harness iframe, token sheets and theme sheets. The postcss config of the consumer applies, so tailwind pipelines work.

5. The consumer `vite` block merges into the harness config; aliases and plugins follow the components.

## The component page

```markdown
---
title: MarButton
type: component
data:
  system: nimtech
  component: MarButton
  package: "@nimling/components-nimtech"
---

## Usage

...any prose, code, mermaid, callouts, everything nimpress markdown supports...
```

1. One `type: component` per folder, enforced at build.

2. Grouping is physical folders: `docs/components/Inputs/MarTextInput/index.md` renders an Inputs group in the sidebar. Move folders to regroup.

3. Group icon and styling come from the `data` block of any member page, latest definition wins. `data.groupIcon` is an ascii icon rendered before the group label, `data.groupStyle` is inline css applied to the group row, and `data.group` optionally names the target group path when it differs from the page's own folder:

```yaml
data:
  system: nimtech
  component: MarTextInput
  groupIcon: "▤"
  groupStyle: "color: var(--np-brand)"
```

4. The component's CLAUDE.md renders on the page, editable in place during local dev, readonly everywhere else.

5. The overview page keeps the standard content width. Stories open the full workshop screen.

## Stories

A value story, controls seed from the props and drive the component live:

```ts
import { vueStory } from '@nimling/nimpress/story'

// story: Primary
export default vueStory({
  name: 'Primary',
  props: { label: 'Save', severity: 'primary' }
})
```

An executable story, the render function mounts verbatim inside the harness:

```ts
import { vueStory } from '@nimling/nimpress/story'
import { ref } from 'vue'
import MarBlockEditor from '@/components/MarBlockEditor'

// story: Basic
export default vueStory({
  name: 'Basic',
  render: () => ({
    components: { MarBlockEditor },
    setup() {
      const value = ref('<p>Hello.</p>')
      return { value }
    },
    template: `<MarBlockEditor v-model="value" content-type="html" />`
  })
})
```

1. Name resolution: `// story: <name>` comment, then the `name` field, then the file name.

2. Svelte stories use `svelteStory` and can override `component` for wrapper demos.

3. Shared fixtures live in `docs/components/_shared/` and import as `../../_shared/<name>`.

4. Props travel base64 encoded in the harness url, so any control state is a shareable link, and the same channel updates the component live without reloads.

## The workshop screen

Selecting a story in the sidebar opens the workshop: toolbar, stage, and props panel in a css grid filling the content area.

1. Toolbar: a theme toggle scoped to the component inside the iframe, zoom, vision simulation filters, dock switch for the props panel, reload, and open, which loads the bare harness in a new tab.

2. Stage: the component in its iframe on a checkered surface. The docs app theme stays untouched by the workshop theme toggle.

3. Props panel: a table of rows, one per control, with the prop cell, the input cell, and an actions cell. Object types render nested member rows, arrays render item rows with add and remove, string literal unions render selects, json editors remain only for opaque types. Slot inputs, event pills with fired counters, and a payload log sit below. Dock it bottom or right and drag the divider to resize.

4. Mock: every row's actions cell has a mock button, sample data for that prop alone, an added sample item on arrays. The panel header mock button fills every empty control at once.

5. Events: interact with the component in the stage; each firing counts up on its event pill and logs its payload below, which is how emits are tested.

## Schema parsing

Controls derive from the component source without executing it. A prop and its control are one structure: the control tree is the type projected onto inputs, the value is plain data at every level.

1. Vue: `defineProps` destructure or generic, defaults from the destructure, type aliases resolved from the script and sibling `.types.ts` files, slots from the template, emits from `defineEmits`.

2. Svelte 5: `$props()` destructure with `$bindable` defaults, `Snippet` members as slots, `on*` function members as emits.

3. Package mode: the props interface parses from the package `d.ts`, `<Component>Props` or `Props`.

4. Recursion: an object typed prop resolves its interface or type alias into member controls, an array typed prop gets an item control per row, four levels deep with cycle protection. Types that stay opaque, functions and unresolvable externals, fall back to a json editor.

5. Descriptions: a JSDoc block or a line comment directly above a type member becomes the description under its control, at every nesting level. Document the prop where it is typed and the panel picks it up.

6. Stories never carry control definitions. A story is values only, plain data destructured into the control tree by shape; the component source stays the single source of truth for what the controls are.

7. JSON Schema override: `data.controls` in the page frontmatter maps a prop name to a json schema, `type`, `properties`, `required`, `items`, `enum`, `description`, `default`, `title`. A matching schema replaces the parsed control for that prop, an unmatched key adds one, and the same generated form set renders it: objects become member rows, arrays become item rows, enums become selects. One reusable form generator for both sources.

```yaml
data:
  controls:
    state:
      type: object
      required: [items, selectedIndex]
      properties:
        items:
          type: array
          items:
            type: object
            properties:
              title: { type: string, description: Row label }
        selectedIndex: { type: integer }
```

8. Display name: the page `title` is the human readable name shown in the sidebar, crumb, and overview heading. `data.component` stays the technical component identifier and shows as a badge on the overview when the two differ. Rename the title freely, the harness resolves by `data.component`.

## CLI

```bash
nimpress modules import nimtech --stories=../lib/src/scenarios --match='^Mar'
nimpress modules import nimtech ../elsewhere/Special.vue --name=Special
nimpress modules story nimtech MarButton
nimpress modules dev nimtech
nimpress modules build
```

1. `import <system>` walks the source tree and any extra `--stories` directories, mines storybook CSF: groups from meta titles, named value stories from args, render stories ported executable with their helpers and shared data modules, then fills storyless components with typed auto stories. `--match` filters component names by regex.

2. `import <system> <file>` registers a single external component into the system.

3. `story <system> [component]` writes typed mock auto stories, framework autodetected from the file extension with `--framework=` as the override.

4. `dev` and `build` run the harness servers and emit the static bundles. `nimpress dev` and `nimpress build` include them automatically.

## Hosting and guard

1. Build output is fully static: the site plus `dist/_components/<system>/` per system, same paths as dev, no server required.

2. Component pages gate like any page: `scope` or `claim` in frontmatter moves the page into the gated artifact flow, and the harness bundles deploy with the site.
