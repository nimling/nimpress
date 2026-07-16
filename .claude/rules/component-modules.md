# Component modules

The component workshop surface in nimpress. One system per component library, one page per component, stories as executable files beside the page. This rule is the contract for authoring and for the pipeline.

## Config

The `modules` array in the nimpress config declares systems:

```ts
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
```

1. `framework` is `vue` or `svelte`. One framework per system.

2. `source` is the component source root for local mode. `package` is the released npm package for package mode. Source wins when the component resolves; package is the fallback.

3. `css` entries load inside the harness iframe. Point them at the token and theme sheets the components need.

4. The harness mounts the component bare. Everything a library needs around its components is declared, never discovered: `setup` points at a module bootstrapping the app, its default export carries `install(app)` run on every created app before mount and `companion`, a component rendered beside every story; a svelte system exports a function run once. Overlay roots, plugin installs, and providers all come through `setup` or the harness.

4.1. `harness` points at the system harness component wrapping every story, a `.ts`, `.tsx`, `.vue`, or `.svelte` path. There is no filename discovery; a harness exists only where the config or a story declares it.

4.2. The frame is a composition of harness primitives imported from `@nimling/nimpress/harness/vue` or `@nimling/nimpress/harness/svelte`. `ComponentHarness` is the root, `ComponentStory` is the mount point where nimpress renders the component under test, `ComponentHarnessEffects` wraps its children and applies the toolbar drop shadow, `ComponentHarnessOverlay` mounts the system overlay root. The default composition is `ComponentHarness` wrapping `ComponentHarnessEffects` around `ComponentStory` with `ComponentHarnessOverlay` beside it, and it runs when a system declares no harness.

4.3. A custom harness imports the primitives and arranges them freely, wrapping `ComponentStory` in a layout, adding providers, reordering, or omitting a piece. nimpress feeds the component, its props, slots, and overlay into the tree, so `ComponentStory` always resolves it. The checkerboard background, zoom, and vision filters are workshop chrome around the iframe, not harness primitives, and stay on the toolbar.

5. `port` pins the harness dev server. Pin distinct ports when several repos run side by side.

6. Consumer `vite` config flows into the harness, so aliases like `@` work inside components and stories.

7. `visibility: dev-only` keeps a system in `nimpress dev` and out of the built bundle.

## The component page

1. A folder under `docs/components/<Group>/<Component>/` holds exactly one md file with `type: component`; the build refuses a second one. The folder becomes the sidebar parent, the page appears inside it under its title, stories follow as siblings.

2. Frontmatter contract: `title`, `type: component`, `data.system`, `data.component`, optional `data.package`, optional `data.file` when the source layout deviates from `<Component>/<Component>.<ext>`.

2.1. The overview body opens with the `## Usage` import statement, then prose describing the component, what it is for, its behaviors, its slots and events. Import and create scaffold the usage section; the description is authored by hand and is expected on every component. The live preview frame renders below the body automatically, followed by the CLAUDE.md section; neither is written in the markdown.

3. Grouping is physical or declared: the group folder above the component folder groups by location, and a top level `sidebar` frontmatter block groups by declaration without changing the folder or the URL. A declared group sits at the outer level, sibling to the physical group folders, standing in for the page's parent folder in the sidebar.

3.1. The `sidebar` block: required `name` as the verbatim group label, optional `icon` for an ascii icon before the label, optional `style` for inline css on the group row, optional `path` overriding the group route. Latest definition among members wins. A `name` matching the page's own parent folder decorates that physical group instead. On a folder `index.md` the block decorates the folder's own sidebar entry rather than nesting a group.

4. A CLAUDE.md in the component source folder renders on the page and is editable in local dev only.

## Stories

1. A story is a `.story.tsx` file beside the component page, so html sits directly in the render; `.story.ts` also loads. Import `vueStory` or `svelteStory` from `@nimling/nimpress/story` and default export the definition.

2. Name resolution order: `// story: <name>` comment frontmatter, then the `name` field, then the file name.

3. A value story carries `props` and optional `slots`; the workshop controls seed from it and drive the component live over the iframe channel with base64 encoded props in the url.

4. An executable story carries `render`, a function returning a mount definition. Vue: an options object with `components`, `setup`, `template`. The harness runs it verbatim; controls do not apply. A story is self contained: it imports the component and holds its own fixture data inline. There is no shared story fixture folder.

4.1. A story nests itself in a per story harness with the `harness` field: `vueStory({ harness: BlockEditorHarness, props })`. The harness is a component that renders `<slot />` where `ComponentStory` mounts, and it folds inside the system harness as `SystemHarness > StoryHarness > ComponentStory`. Shared setup that a family of stories needs, a wrapping editor, providers, or seeded context, lives in one harness component the stories import from their group folder. `MarModals` is the system harness for every component; `MarBlockEditor` is the block group's per story harness.

5. Props and controls are one structure loaded from `schema.json`. The schema is the read path: the workshop controls, validation, and mock selection all come from it. Object schemas resolve into nested member controls, arrays into row editors, enums into selects. Story `props` are plain data destructured into that tree; a story never defines controls.

6. `schema.json` is generated from the component types by import, create, and `create --component=<ref> --schema`. Prop descriptions come from JSDoc blocks or line comments above the type member in the component source; document props where they are typed, then regenerate. The schema carries `properties`, `required`, `slots`, `emits`, and a `mock` name per member.

7. `data.controls` in the page frontmatter maps a prop name to a json schema (`type`, `properties`, `required`, `items`, `enum`, `description`, `default`, `title`) that replaces or adds the control for that prop on top of `schema.json`.

8. The page `title` is the human readable display name; `data.component` is the technical identifier the harness resolves. They may differ freely.

## Controls and kinds

1. Control kinds derive from the schema: `text`, `number`, `boolean`, `select` from enums, `object` with nested member rows, `array` with item rows, `record` with key value entries, `function` for callable props, `json` only for opaque leaves.

2. Function props and events hold real code: the workshop stores `{ __nimpressFn: "<source>" }` values edited in a CodeMirror editor, the harness compiles the source with the Function constructor and runs it on every call, firings counting on the event row and printing in the console panel. The default mock stub logs its arguments.

3. Every event renders as its own control row under the events header: the handler source sits in an always visible code editor spanning the row, mock resets it to the logging stub, clear detaches the event, a chevron hides the editor per row. A story starts with logging stubs attached to all events.

4. Mock resolves from the schema through the `@nimling/nimpress/mock` named exports: the `mock` name stored per member picks the function, `mockEmail`, `mockParagraph`, `mockInt`, `mockOption`, `mockEvent`, and the rest, all star wars flavored. Reclicking regenerates via a seed. Per row mock fills one prop; the panel header mock fills everything empty including handlers.

5. Control values persist to localStorage per system, component, and story. Clear per row or clear all from the panel header. The json dialog in the panel head shows the live values as one editable json object plus the schema, with copy and populated counts.

## The workshop layout

1. The shell is the martin special: absolute inset zero root, `overflow: hidden` everywhere structural, one unconditional grid, top bar row then sidebar and page columns, the document never scrolls, scrolling lives only inside panels, the sidebar, and the component's own frame.

2. The workshop grid has a bottom slot and a right slot that collapse to zero when empty. The props panel and the frame console panel each toggle from the toolbar and dock to either slot; sharing a slot splits it. Drag areas are unstyled divs straddling the panel borders.

3. The console panel streams the iframe's own console, every level plus window errors and unhandled rejections, forwarded over the message bridge, filterable and clearable. An input at the bottom evaluates js inside the frame console style, enter runs, arrows walk the history, input and result echo as `>` and `<` entries.

4. The harness iframe document is locked, `#host` is absolute inset zero with `overflow: auto`; a natural sized component centers on the checkered background, an oversized one scrolls inside the frame, and one set to full width and height fills the frame exactly at any zoom.

5. The toolbar shadow toggle drops a shadow on the component inside the frame and an inset shadow on the frame itself, tuned per frame theme so both read on light and dark.

## Embedding a component in any page

The `:::component` directive renders a live component inline in any markdown page through the same harness:

```markdown
:::component {"component":"MarButton","props":{"label":"Save"},"height":"12em"}
:::
```

1. `component` alone suffices when one system is configured; `system` names it otherwise. `story` selects a story file by its base name, `props` and `slots` travel base64 encoded, `height` sizes the frame.

2. `:::component MarButton` is the shorthand for the default story with default controls.

## CLI

Every modules subcommand takes `--system=<name>`; it is required only when several systems are configured.

1. `nimpress modules import` walks the system source, mines storybook CSF files for groups from meta titles, named stories with args, argTypes into `data.controls`, and render stories ported executable, then fills storyless components with typed auto stories. A data module a render story imports copies in beside the story so the component folder stays self contained. Flags: `--source=`, `--stories=<extra csf dir>`, `--match=<component name regex>`, `--select` for interactive picking. Reimports are idempotent.

2. `nimpress modules import <file> --name=` registers one external component file into the system.

3. `nimpress modules story [component] [--framework=]` writes typed mock auto stories.

4. `nimpress modules create <Component>` scaffolds the dedicated component folder: Overview `index.md`, one typed auto story, and `schema.json`.

5. `nimpress modules create --component=<ref> --schema` regenerates `schema.json` for one existing component page from the component types. The ref is the component name when unique across systems, else the component file path. This is the refresh loop after changing component types, since the workshop reads the schema, not the source.

6. `nimpress modules lint [--system=]` checks framework purity of stories and component files, `schema.json` presence and validity beside every `index.md`, value story props against `schema.json`, and `schema.json` drift against the component source. Harness and render stories are exempt from the prop check. Run it after touching stories, schemas, or component types.

7. `nimpress lint` validates structure, folder and file naming, file combinations, frontmatter, and every import in content code files, then builds to verify the output compiles. The import pipeline lives in the nimpress CLI; a consumer repo carries no generator or import scripts.

8. Every import and create writes `schema.json` beside `index.md`. Opaque prop types log warnings naming the component, prop path, and type; fix them by documenting the type in the component file or a sibling `.types.ts` and regenerating.

9. `nimpress modules dev [--system=]` runs harness servers. `nimpress dev` starts them all beside the docs.

10. `nimpress modules build [--system=]` emits static harness bundles into `dist/_components/<system>/`; `nimpress build` runs it for every system whose visibility is not `dev-only`.

11. `nimpress export [--target=] [--out=]` collects pages marked with the `export:` frontmatter header into `.nimpress` for the docs-sync pipeline, rewriting component pages to package mode. The `docs-export` action is the pipeline twin; see the docs-sync rule.
