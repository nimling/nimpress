---
title: Component modules
order: 1
group:
  name: Components
---

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

5. The harness mounts every component the way its real app would, and that baseline is built in. Vue systems get PrimeVue with the confirmation service installed when the consumer depends on primevue, and the system's `ModalsRoot` rendered beside every story in the same app when the source tree holds one, so overlays, dialogs, dropdowns, tooltips, and notifications work in every frame without configuration. When a library bootstraps differently, `setup` points at a module replacing the baseline: the default export carries `install(app)`, run on every created app before mount, and `companion`, a component rendered beside every story; a svelte system exports a function run once.

6. The frame is composed from harness primitives, importable from `@nimling/nimpress/harness/vue` or `@nimling/nimpress/harness/svelte`, so you can rearrange it. `ComponentHarness` is the root; `ComponentStory` is where the component under test renders; `ComponentHarnessEffects` applies the toolbar drop shadow to whatever it wraps; `ComponentHarnessOverlay` mounts the system overlay root. The default is `ComponentHarness` around `ComponentHarnessEffects` around `ComponentStory` with `ComponentHarnessOverlay` beside it. Drop a `harness.vue` or `harness.svelte` in the source root, or set the `harness` config key, to import these and arrange them yourself, wrapping the story in a layout, reordering, or omitting a piece; nimpress feeds the component, props, slots, and overlay in so `ComponentStory` always resolves. The checkerboard, zoom, and vision filters are workshop chrome around the iframe, not primitives, and stay on the toolbar.

7. The consumer `vite` block merges into the harness config; aliases and plugins follow the components.

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

2. Grouping comes from two sources. Physical folders: `docs/components/Inputs/MarTextInput/index.md` renders an Inputs group in the sidebar. Frontmatter: a top level `group` block places the page under a named group at the outer level, sibling to the physical group folders, standing in for the page's parent folder in the sidebar without changing its folder or its URL.

3. The `group` block carries the group definition. `name` is required and is the sidebar label, rendered verbatim. `icon` is an optional ascii icon rendered before the group label. `style` is optional inline css applied to the group row. Pages sharing a `name` land in the same group, latest `icon` and `style` definition wins. A `name` matching the page's own folder decorates that physical group instead of moving the page:

```yaml
group:
  name: Inputs
  icon: "▤"
  style: "color: var(--np-brand)"
```

4. The component's CLAUDE.md renders on the page, editable in place during local dev, readonly everywhere else.

5. The overview page keeps the standard content width. Stories open the full workshop screen.

6. The overview body opens with the `## Usage` import, then prose describing the component, expected on every component page. The live preview frame renders below the body automatically with a link into the workshop, followed by the CLAUDE.md section; neither is authored in the markdown.

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

3. Props travel base64 encoded in the harness url, so any control state is a shareable link, and the same channel updates the component live without reloads.

## The workshop screen

Selecting a story in the sidebar opens the workshop: toolbar, stage, and two panel slots, bottom and right, in a css grid filling the content area. The document never scrolls; every scrollbar lives inside a panel, the sidebar, or the component frame.

1. Toolbar: a theme toggle scoped to the component inside the iframe, zoom, a vision simulator matching the storybook set, blurred vision, low contrast, grayscale, protanopia, protanomaly, deuteranopia, deuteranomaly, tritanopia, tritanomaly, achromatopsia, achromatomaly, each option carrying an inline svg icon, color blindness rendered through svg color matrices. Then a shadow toggle dropping a theme tuned shadow on the component and an inset shadow on its frame, a props panel toggle, a console panel toggle, reload, and open. Every icon button shows a tooltip that never leaves the viewport.

2. Stage: the component in its iframe on a checkered surface. The docs app theme stays untouched by the workshop theme toggle. A natural sized component centers on the backdrop, an oversized one scrolls inside the frame, a full size one fills the frame exactly at any zoom.

3. Props panel: a table of rows, one per control, with the prop cell, the input cell, and inline actions. Object types render nested member rows, arrays render item rows with add and remove, records render key value entries with editable keys, string literal unions render selects, function props render their source in a code editor, json editors remain only for opaque types. Required fields left empty mark red. The panel head carries dock, mock, clear, the json dialog, and hide; the toolbar toggle brings it back.

4. Console panel: the iframe's own console mirrored live, every level plus window errors and unhandled rejections, timestamped with level colors, filterable and clearable. An input at the bottom evaluates js inside the frame console style, enter runs, arrows walk the history, input and result echo as `>` and `<` entries. It toggles from the toolbar and docks bottom or right exactly like the props panel; two panels in one slot split it with a draggable divider.

5. Mock: every row's actions cell has a mock button, hint driven star wars sample data for that prop alone, an added sample item on arrays, sample entries on records, a logging stub on functions. Reclicking regenerates fresh values. The panel header carries mock for every empty control and clear emptying every input form.

6. Persistence: edited values, slots, and event handlers save to localStorage per system, component, and story, and restore on the next visit.

7. Events: every event is a control row under the events header, structured like the props rows with the name and actions on one line and the type and description below. The handler source sits in an always visible code editor spanning the row, running in the frame on each firing and defaulting to a console log stub; mock resets the stub, clear detaches the event, a chevron hides the editor. Firings count in the row description and print in the console panel.

8. The component's own sidebar entry is `Overview`; the stories are real router paths under the component path.

## Schema parsing

Controls derive from the component source without executing it. A prop and its control are one structure: the control tree is the type projected onto inputs, the value is plain data at every level.

1. Vue: `defineProps` destructure or generic, defaults from the destructure, type aliases resolved from the script and sibling `.types.ts` files, slots from the template, emits from `defineEmits`.

2. Svelte 5: `$props()` destructure with `$bindable` defaults, `Snippet` members as slots, `on*` function members as emits.

3. Package mode: the props interface parses from the package `d.ts`, `<Component>Props` or `Props`.

4. Recursion: an object typed prop resolves its interface or type alias into member controls, an array typed prop gets an item control per row, `Record<string, T>` and index signatures become key value entries, top level `(args) => ...` signatures become function controls, four levels deep with cycle protection. Types that stay opaque fall back to a json editor and log documentation warnings on import.

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
nimpress modules create --component=MarButton --schema
nimpress modules lint nimtech
nimpress modules dev nimtech
nimpress modules build
```

1. `import <system>` walks the source tree and any extra `--stories` directories, mines storybook CSF: groups from meta titles, named value stories from args, render stories ported executable with their helpers, then fills storyless components with typed auto stories. A data module a render story imports copies in beside the story so every component folder stays self contained; there is no shared fixture folder. `--match` filters component names by regex, `--select` lists the matches and prompts interactively, comma separated numbers, names, or `/regex/`. Meta `argTypes` convert to `data.controls` json schemas on the generated page so storybook custom inputs survive the conversion.

2. `import <system> <file>` registers a single external component into the system.

3. `story <system> [component]` writes typed mock auto stories, framework autodetected from the file extension with `--framework=` as the override.

4. `create <system> <Component>` scaffolds a new component's dedicated folder with the base setup: the Overview `index.md`, one typed auto story when the source component exists or a stub story otherwise, and `schema.json`.

5. `create --component=<ref> --schema` regenerates `schema.json` for one existing component page from the component types. The ref is either the component name, unique across every system, or the path to the component file when the name is ambiguous.

6. `lint [system]` checks every component page of the named system, or all systems: story helpers and story imports matching the system framework, the component file extension matching the framework, `schema.json` present and valid beside every `index.md`, value story props all present in `schema.json`, and `schema.json` matching what the component source parses to today. Harness stories and render stories are exempt from the prop check because their props feed the harness or the render function, not the control tree.

7. Every component folder gets `schema.json` on import and create, the props as a json schema generated from the parsed control tree, the same generator behind the workshop's json dialog. Prop types the parser cannot resolve log warnings with the component, the prop path, and the type, the hint that the type should be documented where the parser sees it.

8. `dev` and `build` run the harness servers and emit the static bundles. `nimpress dev` and `nimpress build` include them automatically.

## Hosting and guard

1. Build output is fully static: the site plus `dist/_components/<system>/` per system, same paths as dev, no server required.

2. Component pages gate like any page: `scope` or `claim` in frontmatter moves the page into the gated artifact flow, and the harness bundles deploy with the site.
