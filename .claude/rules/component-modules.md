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

8. `stage` bounds the component area inside the harness frame: `minWidth`, `maxWidth`, and optional `padding`, numbers as px. When set the area spans the frame like a page column clamped between the bounds.

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

2.1. A story decorates its own sidebar row with an optional `sidebar` object, `sidebar: { name, icon, style }`, the same shape as the frontmatter `sidebar` block. `name` overrides the row label, `icon` is an ascii glyph rendered before it, `style` is inline css on the row. The story link stays keyed on the resolved story name, so only the label changes, never the url.

2.2. Story `name`, `props`, `slots`, and `sidebar` are read by parsing the story file as text, never by executing the module, so their values must be inline literals. An imported or computed value does not resolve; a `props` or `sidebar` that references an import comes through empty. A story that needs an imported value, a raw html or css file loaded with `?raw`, uses `render`, which runs in the browser where imports resolve.

3. A value story carries `props` and optional `slots`; the workshop controls seed from it and drive the component live over the iframe channel with base64 encoded props in the url.

4. An executable story carries `render`, a function returning a mount definition. Vue: an options object with `components`, `setup`, `template`. The harness runs it verbatim; controls do not apply. A story is self contained: it imports the component and holds its own fixture data inline. There is no shared story fixture folder.

4.1. A value story nests itself in a per story harness with the `harness` field: `vueStory({ harness: BlockEditorHarness, props })`. The harness is a component that renders `<slot />` where `ComponentStory` mounts, and it folds inside the system harness as `SystemHarness > StoryHarness > ComponentStory`. A render story includes the shared harness component directly in its own markup instead and owns its sizing there, `<div style="width: 210mm">` around the harness when the story needs a width. Shared setup that a family of stories needs, a wrapping editor, providers, or seeded context, lives in one harness component the stories import from their group folder, a `harness.vue` beside the group's pages.

5. Props and controls are one structure loaded from the schema file beside `index.md`, `schema.json` or `schema.yml`, one of the two. The schema is the read path: the workshop controls, validation, and mock selection all come from it. Object schemas resolve into nested member controls, arrays into row editors, enums into selects. Story `props` are plain data destructured into that tree; a story never defines controls. The schema carries `properties`, `required`, `slots`, `emits`, and a `mock` name per member.

6. The schema is seeded from the component types by import and create, and from there the file is authored: defaults, enums, descriptions, mocks, and narrowing live in the schema, not in the component. `nimpress modules update [component]` upserts source changes into it: new props, slots, and emits are added, a changed type shape refreshes on existing members, authored fields are never overwritten, an empty description fills from a JSDoc or line comment above the type member, and a member gone from the source stays in the file and is flagged so the author decides its removal.

6.1. In `nimpress dev` the upsert runs automatically whenever a component under a page changes, and every pass warns about what the author should fix: props without a description, opaque types, and schema members without a source counterpart. The warnings coach the library toward fully documented and typed components.

6.2. In local dev the json dialog carries a set defaults action that writes the current live control values into the schema file as the prop defaults, so defaults are found by testing in the workshop and persisted where they belong.

7. A `data.schema` block in the page frontmatter carries the same schema structure inline and merges over the schema file as the page local last word, for small curations that do not warrant the file.

8. The page `title` is the human readable display name; `data.component` is the technical identifier the harness resolves. They may differ freely.

## Controls and kinds

1. Control kinds derive from the schema: `text`, `number`, `boolean`, `select` from enums, `object` with nested member rows, `array` with item rows, `record` with key value entries, `function` for callable props, `json` only for opaque leaves. Enum options render as chips in the control info; a long option list collapses to one line that expands in a hover popup.

2. Function props and events hold real code: the workshop stores `{ __nimpressFn: "<source>" }` values edited in a CodeMirror editor, the harness compiles the source with the Function constructor and runs it on every call, firings counting on the event row and printing in the console panel. The default mock stub logs its arguments.

3. Every event renders as its own control row under the events header: the handler source sits in an always visible code editor spanning the row, mock resets it to the logging stub, clear detaches the event, a chevron hides the editor per row. A story starts with logging stubs attached to all events. A default button at the events header resets every handler to the logging stub at once.

4. Mock resolves from the schema through the `@nimling/nimpress/mock` named exports: the `mock` name stored per member picks the function, `mockEmail`, `mockParagraph`, `mockInt`, `mockOption`, `mockEvent`, and the rest, all star wars flavored. Reclicking regenerates via a seed, and option picks exclude values already present so a reclick lands on a fresh option. Per row mock fills one prop; the panel header mock fills everything empty including handlers.

5. Control values persist to localStorage per system, component, and story. Clear per row or clear all from the panel header; the panel header also carries default, resetting every control to its schema default and every slot to its declared default. Once the workshop has pushed props to the frame, the pushed set alone drives the component and story props and required defaults no longer fill in underneath, so a cleared prop renders truly empty. The json dialog in the panel head shows the live values as one editable json object plus the schema, with copy and populated counts.

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

1. `nimpress modules import` walks the system source, mines storybook CSF files for groups from meta titles, named stories with args, argTypes merged into the seeded schema, and render stories ported executable, then fills storyless components with generated default stories. A mined story whose name equals the component becomes the Default story, written as `default.story.tsx` with the name `Default`. A data module a render story imports copies in beside the story so the component folder stays self contained. Flags: `--source=`, `--stories=<extra csf dir>`, `--match=<component name regex>`, `--select` for interactive picking. Reimports upsert the schema and never clear authored content.

2. `nimpress modules import <file> --name=` registers one external component file into the system.

3. `nimpress modules story [component] [--framework=]` writes `default.story.tsx` named `Default` for every storyless component page, one uniform entry story per component.

4. `nimpress modules create <Component>` scaffolds the dedicated component folder: Overview `index.md`, `default.story.tsx`, and the seeded `schema.json`.

5. `nimpress modules update [component] [--system=]` upserts the schema for one component page, or every page of a system when no component is named. The ref is the component name when unique across systems, else the component file path; `create --component=<ref> --schema` runs the same upsert for one page. This is the refresh loop after changing component types, since the workshop reads the schema, not the source.

6. `nimpress modules lint [--system=]` checks framework purity of stories and component files, that every page carries at least one story, exactly one schema file present and parseable beside every `index.md`, value story props against the schema, and the schema structurally against the component source: every source member exists in the schema, schema members without a source counterpart are flagged, an authored type conflicting with the source type fails, and an authored enum must fit the source type and stay inside a source union. Authored narrowing, an enum over a string, is legal. Harness and render stories are exempt from the prop check. Coaching warnings for undocumented props and opaque types print without failing the run. Run it after touching stories, schemas, or component types.

7. `nimpress lint` validates structure, folder and file naming, file combinations, frontmatter, and every import in content code files, then builds to verify the output compiles. The import pipeline lives in the nimpress CLI; a consumer repo carries no generator or import scripts.

8. Import and create seed the schema beside `index.md` when none exists. Opaque prop types log warnings naming the component, prop path, and type; fix them by authoring the member in the schema with enum or properties, or by documenting the type in the component file or a sibling `.types.ts` and running update.

9. `nimpress modules dev [--system=]` runs harness servers. `nimpress dev` starts them all beside the docs.

10. `nimpress modules build [--system=]` emits static harness bundles into `dist/_components/<system>/`; `nimpress build` runs it for every system whose visibility is not `dev-only`.

11. `nimpress export [--target=] [--out=]` collects pages marked with the `export:` frontmatter header into `.nimpress` for the docs-sync pipeline, rewriting component pages to package mode. The `docs-export` action is the pipeline twin; see the docs-sync rule.
