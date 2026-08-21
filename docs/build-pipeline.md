---
title: Build pipeline
order: 7
---

How `.md` files turn into routes, page shells, and lazy markdown bodies at build time.

## One page, two artifacts

The plugin walks `contentDir` and produces two artifacts per page:

1. A page shell Svelte component at `virtual:nimpress/page-component/<slug>.svelte`. The shell knows the typed frontmatter, the route, and which renderer to use. It calls `setPageMeta` to write the SEO and social tags to `<head>`.

2. A page body module at `virtual:nimpress/page-body/<slug>.js`. The body exports the rendered markdown HTML, the heading list for the table of contents, the flattened OpenAPI spec for `openapi` pages, and the ordered entries for `changelog` pages.

The shell imports the body lazily through `import('virtual:nimpress/page-body/<slug>.js')`. The router resolves the shell first, the title and hero band render immediately, and the body resolves in parallel.

## Why split

1. **Smaller initial parse**: shells are tiny, bodies hold the long HTML. Routes that share a layout share the shell shape.

2. **Faster first paint**: the shell can write the title and the hero band before the body resolves.

3. **Clean separation**: the shell is the type level page (frontmatter, kind, head metadata). The body is the rendered content. Each can be cached, split, and reasoned about independently.

## Virtual modules

| Module | Purpose |
|--------|---------|
| `virtual:nimpress/manifest` | Page index, byPath lookup, sidebar tree, site metadata |
| `virtual:nimpress/search` | MiniSearch corpus, one entry per visible page |
| `virtual:nimpress/pages` | `{ [slug]: () => import('virtual:nimpress/page-component/<slug>.svelte') }` |
| `virtual:nimpress/bodies` | `{ [slug]: () => import('virtual:nimpress/page-body/<slug>.js') }` |
| `virtual:nimpress/page-component/<slug>.svelte` | Page shell with frontmatter and renderer dispatch |
| `virtual:nimpress/page-body/<slug>.js` | Page body with HTML, headings, optional spec or changelog data |

## Renderer dispatch

The shell selects a renderer by `frontmatter.type`:

1. `doc` mounts `Page` once the body resolves.

2. `openapi` mounts `OpenApiRoot` with `body.openApiSpec`.

3. `changelog` mounts `ChangelogPage` with merged shell and body.

4. `hero` mounts `HeroPage` immediately and passes the `bodyPromise` through. The hero band paints before the body resolves; the body renders inside the page once it does.

## Hydration

The body returns HTML containing placeholder markers for components: `<div class="np-mermaid">`, `<div class="np-code-group">`, `<pre class="shiki" data-lang>`, `<div class="np-actions">`, `<div class="np-feature">`. `Page.svelte` walks the rendered DOM, replaces each marker with a mounted Svelte component, and tears them down when the page changes.

## Defensive checks

1. The plugin throws if a content file resolves outside `contentDir` to make stale dist artifacts and wrong working directories obvious.

2. Duplicate effective paths throw at build time. The exception is multiple `changelog` pages sharing one path, which collapse into one rendered page.

3. Invalid frontmatter logs a warning and the page falls back to a title taken from the filename. Unknown frontmatter fields warn but do not fail.

## Output

A build writes the site into the output folder, `dist` by default and `paths.out` when set.

1. `index.html` and a copy of it as `404.html`, so a static host routes a deep link back into the app.

2. `.nojekyll`, so a host that runs Jekyll over the output still serves the folders whose names start with an underscore.

3. Every non markdown file under `contentDir`, at the same relative path, so an image or a `.dbml` file sits beside the page that uses it.

4. The assets folder, the feeds, the sitemap, the search index, the guarded bundles, and one harness bundle per component system.

## Serving under a subfolder

`base` in the config states the url prefix the whole site is served under, `/` by default. It reaches the vite build, the router, every generated link, the markdown links and images, the search results, the feeds and canonical urls, the guarded fetches, and the harness bundles. A project page on GitHub Pages sets it to the repository name:

```ts
export default defineConfig({
  base: '/nimpress/'
})
```

Nothing else in the content changes. Links stay written from the site root, and the build resolves them under the prefix.
