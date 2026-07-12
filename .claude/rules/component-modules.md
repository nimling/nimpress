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

4. `port` pins the harness dev server. Pin distinct ports when several repos run side by side.

5. Consumer `vite` config in `nimpress.config.ts` flows into the harness, so aliases like `@` work inside components and stories.

## The component page

1. A folder under `docs/components/<Group>/<Component>/` holds exactly one md file with `type: component`. The folder becomes the sidebar parent, the page appears inside it under its title, stories follow as siblings.

2. Frontmatter contract: `title`, `type: component`, `data.system`, `data.component`, optional `data.package`, optional `data.file` when the source layout deviates from `<Component>/<Component>.<ext>`.

3. Grouping is physical: the group folder above the component folder. Move the folder to regroup.

3.1. Group presentation lives in `data` on member pages: `data.groupIcon` for an ascii icon, `data.groupStyle` for inline css on the group row, optional `data.group` naming the target group path. Latest definition wins.

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

## CLI

1. `nimpress modules import <system>` walks the system source, mines storybook CSF files for groups from meta titles, named stories with args, and render stories ported executable, then fills storyless components with typed auto stories. Flags: `--source=`, `--stories=<extra csf dir>`, `--match=<component name regex>`.

2. `nimpress modules import <system> <file> --name=` registers one external component file into the system.

3. `nimpress modules story <system> [component] [--framework=]` writes typed mock auto stories.

4. `nimpress modules dev [system]` runs harness servers. `nimpress dev` starts them all beside the docs.

5. `nimpress modules build [system]` emits static harness bundles into `dist/_components/<system>/`; `nimpress build` runs it for every non devOnly system.

## Never

1. Never write generator or import scripts inside a consumer repo. The import pipeline lives in the nimpress CLI.

2. Never put two `type: component` pages in one folder. The build refuses.

3. Never hand author `Default` stories. Storyless components get auto stories from the type parser.

4. Never point `css` at files that import from the docs app; the harness is its own vite graph.
