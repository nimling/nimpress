# Component modules

The component workshop surface in nimpress. One system per component library, one page per component, stories as executable files beside the page. This rule is the contract for authoring and for the pipeline.

## Config

The `modules` block in `nimpress.config.ts` declares systems:

```ts
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
```

1. `framework` is `vue` or `svelte`. One framework per system.

2. `source` is the component source root for local mode. `package` is the released npm package for package mode. Source wins when the component resolves; package is the fallback.

3. `css` entries load inside the harness iframe. Point them at the token and theme sheets the components need.

4. The harness mounts every component the way its real app would, and that baseline is built into nimpress. On vue systems it installs PrimeVue with the confirmation service when the consumer has primevue installed, and it renders the system's `ModalsRoot` beside every story in the same app when the source tree holds one, so overlays, dialogs, dropdowns, tooltips, and notifications work in every frame with zero configuration. A repo needs only its markdown folder and `nimpress.config.ts`.

4.1. `setup` in the system config is the rare override: a path to a module replacing the built in baseline when a library bootstraps differently. Its default export is an object, `install(app)` runs on every created app before mount, `companion` is a component rendered beside every story. A svelte system exports a function run once.

5. `port` pins the harness dev server. Pin distinct ports when several repos run side by side.

6. Consumer `vite` config in `nimpress.config.ts` flows into the harness, so aliases like `@` work inside components and stories.

## The component page

1. A folder under `docs/components/<Group>/<Component>/` holds exactly one md file with `type: component`. The folder becomes the sidebar parent, the page appears inside it under its title, stories follow as siblings.

2. Frontmatter contract: `title`, `type: component`, `data.system`, `data.component`, optional `data.package`, optional `data.file` when the source layout deviates from `<Component>/<Component>.<ext>`.

2.1. The overview body opens with the `## Usage` import statement, then prose describing the component, what it is for, its behaviors, its slots and events. Import and create scaffold the usage section; the description is authored by hand and is expected on every component. The live preview frame renders below the body automatically, followed by the CLAUDE.md section; neither is written in the markdown.

3. Grouping is physical or declared: the group folder above the component folder groups by location, and a top level `group` frontmatter block groups by declaration without changing the folder or the URL.

3.1. The `group` block: required `name` as the verbatim group label, optional `icon` for an ascii icon before the label, optional `style` for inline css on the group row. Latest definition among members wins. A `name` matching the page's own parent folder decorates that physical group.

4. A CLAUDE.md in the component source folder renders on the page and is editable in local dev only.

## Stories

1. A story is a `.story.ts` file beside the component page. Import `vueStory` or `svelteStory` from `@nimling/nimpress/story` and default export the definition.

2. Name resolution order: `// story: <name>` comment frontmatter, then the `name` field, then the file name.

3. A value story carries `props` and optional `slots`; the workshop controls seed from it and drive the component live over the iframe channel with base64 encoded props in the url.

4. An executable story carries `render`, a function returning a mount definition. Vue: an options object with `components`, `setup`, `template`. The harness runs it verbatim; controls do not apply.

5. Shared story data modules live in `docs/components/_shared/` and are imported with `../../_shared/<name>`.

6. Props and controls are one structure. Controls are the component's types projected onto inputs: object types resolve into nested member controls, arrays into row editors, string literal unions into selects, four levels deep with cycle protection. Story `props` are plain data destructured into that tree; a story never defines controls.

7. Prop descriptions come from JSDoc blocks or line comments directly above the type member in the component source, at every nesting level. Document props where they are typed, never in stories.

8. `data.controls` in the page frontmatter maps a prop name to a json schema (`type`, `properties`, `required`, `items`, `enum`, `description`, `default`, `title`) that replaces or adds the control for that prop through the same form generator.

9. The page `title` is the human readable display name; `data.component` is the technical identifier the harness resolves. They may differ freely.

## Controls and kinds

1. Control kinds derive from the prop types: `text`, `number`, `boolean`, `select` from string literal unions, `object` with nested member rows, `array` with item rows, `record` from `Record<string, T>` and index signatures with key value entries, `function` from `(args) => ...` signatures, `json` only for opaque leaves.

2. Function props and events hold real code: the workshop stores `{ __nimpressFn: "<source>" }` values edited in a CodeMirror editor, the harness compiles the source with the Function constructor and runs it on every call, firings counting on the event row and printing in the console panel. The default mock stub logs its arguments.

3. Every event from `defineEmits` or svelte `on*` members renders as its own control row under the events header: the handler source sits in an always visible code editor spanning the row, mock resets it to the logging stub, clear detaches the event, a chevron hides the editor per row. A story starts with logging stubs attached to all events.

4. Mock is hint driven star wars data: names and descriptions steer values, users get characters, urls get holonet links, numbers respect width, count, year style hints. Reclicking regenerates via a seed. Per row mock fills one prop; the panel header mock fills everything empty including handlers.

5. Control values persist to localStorage per system, component, and story. Clear per row or clear all from the panel header. The json dialog in the panel head shows the live values as one editable json object plus the generated json schema, with copy and populated counts.

## The workshop layout

1. The shell is the martin special: absolute inset zero root, `overflow: hidden` everywhere structural, one unconditional grid, top bar row then sidebar and page columns, the document never scrolls, scrolling lives only inside panels, the sidebar, and the component's own frame.

2. The workshop grid has a bottom slot and a right slot that collapse to zero when empty. The props panel and the frame console panel each toggle from the toolbar and dock to either slot; sharing a slot splits it. Drag areas are unstyled divs straddling the panel borders.

3. The console panel streams the iframe's own console, every level plus window errors and unhandled rejections, forwarded over the message bridge, filterable and clearable. An input at the bottom evaluates js inside the frame console style, enter runs, arrows walk the history, input and result echo as `>` and `<` entries.

4. The harness iframe document is locked, `#host` is absolute inset zero with `overflow: auto`; a natural sized component centers on the checkered background, an oversized one scrolls inside the frame, and one set to full width and height fills the frame exactly at any zoom.

5. The toolbar shadow toggle drops a shadow on the component inside the frame and an inset shadow on the frame itself, tuned per frame theme so both read on light and dark.

## CLI

1. `nimpress modules import <system>` walks the system source, mines storybook CSF files for groups from meta titles, named stories with args, argTypes into `data.controls`, and render stories ported executable, then fills storyless components with typed auto stories. Flags: `--source=`, `--stories=<extra csf dir>`, `--match=<component name regex>`, `--select` for interactive picking. Reimports are idempotent.

2. `nimpress modules import <system> <file> --name=` registers one external component file into the system.

3. `nimpress modules story <system> [component] [--framework=]` writes typed mock auto stories.

4. `nimpress modules create <system> <Component>` scaffolds the dedicated component folder: Overview `index.md`, one typed auto story, and `schema.json`.

5. Every import and create writes `schema.json` beside `index.md`, the component props as a json schema from the parsed control tree. Opaque prop types log warnings naming the component, prop path, and type; fix them by documenting the type in the component file or a sibling `.types.ts`.

6. `nimpress modules dev [system]` runs harness servers. `nimpress dev` starts them all beside the docs.

7. `nimpress modules build [system]` emits static harness bundles into `dist/_components/<system>/`; `nimpress build` runs it for every non devOnly system.

8. `nimpress export [--target=] [--out=]` collects pages marked with the `export:` frontmatter header into a tree for the docs-sync pipeline, rewriting component pages to package mode. The `docs-export` action is the pipeline twin; see the docs-sync rule.

## Never

1. Never write generator or import scripts inside a consumer repo. The import pipeline lives in the nimpress CLI.

2. Never put two `type: component` pages in one folder. The build refuses.

3. Never hand author `Default` stories. Storyless components get auto stories from the type parser.

4. Never point `css` at files that import from the docs app; the harness is its own vite graph.

5. Never define controls in stories. Stories are values only; controls derive from the component types or `data.controls` json schemas.

6. Never add document level scroll or `scrollbar-gutter` rules; the layout contract forbids page scrolling.
