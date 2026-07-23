---
title: Component modules
order: 1
sidebar:
  name: Components
---

The component workshop: present a component library inside a nimpress site with live rendering, controls, stories, and docs per component. One system per library, vue and svelte both first class, each system rendered through an isolated iframe harness so the docs app and the components never share a runtime.

## Mental model

1. A system is one component library: a framework, a source tree or a released package, and the css it needs.

2. A component page is a folder holding one `type: component` md file. The folder is the sidebar parent; the docs page and the stories are its children.

3. A story is a `.story.tsx` file beside the page, so html sits directly in the render, and `.story.ts` also loads: either a value story, props the controls can drive, or an executable story carrying its own render function.

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
  modules: [
    {
      name: 'nimtech',
      framework: 'vue',
      source: './src/components',
      package: '@nimling/components-nimtech',
      port: 6161,
      css: ['./src/assets/style.css'],
      harness: './docs/components/harness.vue'
    }
  ]
})
```

1. `framework`: `vue` or `svelte`. Vue systems need `@vitejs/plugin-vue` installed in the consumer; the svelte plugin ships with nimpress.

2. `source`: local component tree. Components resolve as `<source>/<Name>/<Name>.<ext>` or `<source>/<Name>.<ext>`, with `data.file` in the page frontmatter as the explicit override for any other layout, including paths outside the source root.

3. `package`: the released npm package. When a component does not resolve from source, the harness imports it as a named export from this package and the props schema parses from the package `d.ts`. A page can override with its own `data.package`, which is how a showcase system presents components from several packages, `primevue` beside your own.

4. `css`: sheets loaded inside the harness iframe, token sheets and theme sheets. The postcss config of the consumer applies, so tailwind pipelines work.

5. The harness mounts the component bare, and everything a library needs around its components is declared. `setup` points at a module bootstrapping the app: the default export carries `install(app)`, run on every created app before mount, and `companion`, a component rendered beside every story; a svelte system exports a function run once. Overlay roots, plugin installs, and providers all arrive through `setup` or the harness, never through discovery.

6. The frame is composed from harness primitives, importable from `@nimling/nimpress/harness/vue` or `@nimling/nimpress/harness/svelte`, so you can rearrange it. `ComponentHarness` is the root; `ComponentStory` is where the component under test renders; `ComponentHarnessEffects` applies the toolbar drop shadow to whatever it wraps; `ComponentHarnessOverlay` mounts the system overlay root. The default is `ComponentHarness` around `ComponentHarnessEffects` around `ComponentStory` with `ComponentHarnessOverlay` beside it. Point the `harness` config key at your own component, a `.ts`, `.tsx`, `.vue`, or `.svelte` path, to import these and arrange them yourself, wrapping the story in a layout, reordering, or omitting a piece; nimpress feeds the component, props, slots, and overlay in so `ComponentStory` always resolves. A value story nests its own harness inside the system one through the `harness` field on `vueStory` and `svelteStory`; a render story includes the shared harness component directly in its markup and owns its sizing there. The checkerboard, zoom, and vision filters are workshop chrome around the iframe, not primitives, and stay on the toolbar.

7. The consumer `vite` block merges into the harness config; aliases and plugins follow the components.

8. `stage` bounds the component area inside the harness frame: `minWidth`, `maxWidth`, and optional `padding`, numbers as px. When set the area spans the frame like a page column clamped between the bounds.

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

2. Grouping comes from two sources. Physical folders: `docs/components/Inputs/MarTextInput/index.md` renders an Inputs group in the sidebar. Frontmatter: a top level `sidebar` block places the page under a named group at the outer level, sibling to the physical group folders, standing in for the page's parent folder in the sidebar without changing its folder or its URL.

3. The `sidebar` block carries the group definition. `name` is required and is the sidebar label, rendered verbatim. `icon` is an optional ascii icon rendered before the group label. `style` is optional inline css applied to the group row. Pages sharing a `name` land in the same group, latest `icon` and `style` definition wins. A `name` matching the page's own folder decorates that physical group instead of moving the page:

```yaml
sidebar:
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

1. Name resolution: `// story: <name>` comment, then the `name` field, then the file name with underscores read as spaces, so `With_Controls.story.ts` names the story `With Controls`.

2. Svelte stories use `svelteStory` and can override `component` for wrapper demos.

3. Props travel base64 encoded in the harness url, so any control state is a shareable link, and the same channel updates the component live without reloads.

## The workshop screen

Selecting a story in the sidebar opens the workshop: toolbar, stage, and two panel slots, bottom and right, in a css grid filling the content area. The document never scrolls; every scrollbar lives inside a panel, the sidebar, or the component frame.

1. Toolbar: a theme toggle scoped to the component inside the iframe, zoom, a vision simulator matching the storybook set, blurred vision, low contrast, grayscale, protanopia, protanomaly, deuteranopia, deuteranomaly, tritanopia, tritanomaly, achromatopsia, achromatomaly, each option carrying an inline svg icon, color blindness rendered through svg color matrices. Then a shadow toggle dropping a theme tuned shadow on the component and an inset shadow on its frame, a props panel toggle, a console panel toggle, reload, and open. Every icon button shows a tooltip that never leaves the viewport.

2. Stage: the component in its iframe on a checkered surface. The docs app theme stays untouched by the workshop theme toggle. A natural sized component centers on the backdrop, an oversized one scrolls inside the frame, a full size one fills the frame exactly at any zoom.

3. Props panel: a table of rows, one per control, with the prop cell, the input cell, and inline actions. Object types render nested member rows, arrays render item rows with add and remove, records render key value entries with editable keys, string literal unions render selects with the options shown as chips in the control info, a long option list collapsing to one line that expands in a hover popup, function props render their source in a code editor, json editors remain only for opaque types. Required fields left empty mark red. The panel head carries dock, mock, default, clear, the json dialog, and hide; the toolbar toggle brings it back.

4. Console panel: the iframe's own console mirrored live, every level plus window errors and unhandled rejections, timestamped with level colors, filterable and clearable. An input at the bottom evaluates js inside the frame console style, enter runs, arrows walk the history, input and result echo as `>` and `<` entries. It toggles from the toolbar and docks bottom or right exactly like the props panel; two panels in one slot split it with a draggable divider.

5. Mock: every row's actions cell has a mock button, hint driven star wars sample data for that prop alone, an added sample item on arrays, sample entries on records, a logging stub on functions. Reclicking regenerates fresh values, and option picks exclude values already present so a reclick lands on a fresh option. The panel header carries mock for every empty control, default resetting every control to its schema default, and clear emptying every input form. Once the panel has pushed props to the frame, the pushed set alone drives the component and story props and required defaults no longer fill in underneath, so a cleared prop renders truly empty.

6. Persistence: edited values, slots, and event handlers save to localStorage per system, component, and story, and restore on the next visit.

7. Events: every event is a control row under the events header, structured like the props rows with the name and actions on one line and the type and description below. The handler source sits in an always visible code editor spanning the row, running in the frame on each firing and defaulting to a console log stub; mock resets the stub, clear detaches the event, a chevron hides the editor. A default button at the events header resets every handler to the logging stub at once. Firings count in the row description and print in the console panel.

8. The component's own sidebar entry is `Overview`; the stories are real router paths under the component path.

## The schema

The schema file beside the page, `schema.json` or `schema.yml`, one of the two, is the read path: the workshop controls, validation, and mock selection load from it, never from the component source at render time. A prop and its control are one structure: the control tree is the schema projected onto inputs, the value is plain data at every level.

1. The schema is seeded once from the component source and is authored from there: defaults, enums, descriptions, mocks, and narrowing live in the schema, not in the component. The seed reads vue through the `defineProps` destructure or generic with type aliases resolved from the script and sibling `.types.ts` files, slots from the template, emits from `defineEmits`; svelte 5 through the `$props()` destructure with `$bindable` defaults, `Snippet` members as slots, `on*` function members as emits. The file carries `properties`, `required`, `slots`, `emits`, and a `mock` name per member.

2. After changing component types, run `nimpress modules update <ref>`. The upsert adds new props, slots, and emits, refreshes a changed type shape on existing members, never overwrites authored fields, fills an empty description from a JSDoc or line comment above the type member, and keeps a member gone from the source in the file, flagged for the author to decide. In `nimpress dev` the upsert runs automatically when a component under a page changes.

3. Every upsert pass and every lint run coaches the author: props without a description, opaque types falling back to json editors, and schema members without a source counterpart print as warnings, guiding the library toward fully documented and typed components. A page without a schema file renders with empty controls and a console warning naming the update command.

4. Recursion: an object typed prop resolves its interface or type alias into member controls, an array typed prop gets an item control per row, `Record<string, T>` and index signatures become key value entries, top level `(args) => ...` signatures become function controls, four levels deep with cycle protection. Types that stay opaque fall back to a json editor; author them in the schema with enum or properties, or document the type in the source and run update.

5. Descriptions author in the schema directly, or in a JSDoc block or line comment above the type member in the source, which fills the schema on the next upsert when the schema field is still empty.

6. Stories never carry control definitions. A story is values only, plain data destructured into the control tree by shape; the schema stays the single source of truth for what the controls are.

7. Inline layer: a `data.schema` block in the page frontmatter carries the same schema structure and merges over the schema file as the page local last word, for small curations that do not warrant the file.

```yaml
data:
  schema:
    properties:
      state:
        type: object
        required: [items, selectedIndex]
        properties:
          items:
            type: array
            items: { enum: [Text, Heading 1, Quote] }
          selectedIndex: { type: integer, default: 0 }
```

8. Defaults by testing: in local dev the json dialog carries a set defaults action that writes the current live control values into the schema file as the prop defaults. Play in the workshop until it looks right, then persist it.

9. Display name: the page `title` is the human readable name shown in the sidebar, crumb, and overview heading. `data.component` stays the technical component identifier and shows as a badge on the overview when the two differ. Rename the title freely, the harness resolves by `data.component`.

## CLI

```bash
nimpress modules import --stories=../lib/src/scenarios --match='^Mar'
nimpress modules import ../elsewhere/Special.vue --name=Special
nimpress modules story MarButton
nimpress modules update MarButton
nimpress modules update
nimpress modules lint
nimpress modules dev
nimpress modules build
```

The system rides along as `--system=<name>` on every subcommand and is required only when several systems are configured.

1. `import` walks the source tree and any extra `--stories` directories, mines storybook CSF: groups from meta titles, named value stories from args, render stories ported executable with their helpers, then fills storyless components with generated default stories. A mined story whose name equals the component itself becomes the Default story, written as `default.story.tsx` named `Default`, so every component opens on the same entry story. A data module a render story imports copies in beside the story so every component folder stays self contained; there is no shared fixture folder. `--match` filters component names by regex, `--select` lists the matches and prompts interactively, comma separated numbers, names, or `/regex/`. Meta `argTypes` merge into the seeded schema so storybook custom inputs survive the conversion, and a reimport upserts without clearing authored content.

2. `import <file>` registers a single external component into the system.

3. `story [component]` writes `default.story.tsx` named `Default` for every storyless component page, framework autodetected from the file extension with `--framework=` as the override. One command fills a whole system so every component carries at least its Default story.

4. `create <Component>` scaffolds a new component's dedicated folder with the base setup: the Overview `index.md`, `default.story.tsx`, and the seeded `schema.json`.

5. `update [component]` upserts the schema for one component page, or every page when no component is named. The ref is either the component name, unique across every system, or the path to the component file when the name is ambiguous. `create --component=<ref> --schema` runs the same upsert for one page.

6. `lint [--system=]` checks every component page of the named system, or all systems: story helpers and story imports matching the system framework, the component file extension matching the framework, at least one story beside every page, exactly one schema file present and parseable beside every `index.md`, value story props all present in the schema, and the schema structurally against the component source: every source member exists in the schema, schema members without a source counterpart are flagged, an authored type conflicting with the source type fails, and an authored enum must fit the source type and stay inside a source union. Authored narrowing, an enum over a plain string, is legal. Harness stories and render stories are exempt from the prop check because their props feed the harness or the render function, not the control tree. Coaching warnings for undocumented props and opaque types print without failing the run.

7. Every component folder gets its schema seeded on import and create, the props as a json schema generated from the parsed control tree, the same generator behind the workshop's json dialog. Prop types the parser cannot resolve log warnings with the component, the prop path, and the type; author the member in the schema or document the type where the parser sees it.

8. `dev` and `build` run the harness servers and emit the static bundles. `nimpress dev` and `nimpress build` include them automatically.

## Hosting and guard

1. Build output is fully static: the site plus `dist/_components/<system>/` per system, same paths as dev, no server required.

2. Component pages gate like any page: `gate` in frontmatter moves the page into the guarded bundle flow, and the harness bundles deploy with the site.
