---
id: 3
parent: 1
relations: []
title: The 404 type emits the not found page the build serves as its fallback
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:53Z
updated_at: 2026-09-03T11:30:53Z
questions: []
---

## Intent
Zensical documents a custom 404 error page that the web server serves as its fallback. nimpress has no not found page in the build output, so an unknown route on GitHub Pages shows the host default. `type: 404` is one page the build emits as `404.html` at the output root.

## Scope
`src/types.ts` PageType. `src/plugin.ts` frontmatterSchema, the build output step that writes html files, the router in `src/framework/router.ts` for the in app unknown route. `src/markdown/NotFoundPage.svelte` new. `src/index.ts`. `docs/page-types/404.md`, `docs/404.md` as this site's own not found page, the rule files, `docs/styling/page-types.md`, `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: add `404` to `PageType` and to the schema union. Lint refuses a second `type: 404` page in a site, the same way a second `type: component` page in a folder is refused.
2. nimpress: write `src/markdown/NotFoundPage.svelte`. It renders inside the doc shell with the sidebar and no rail, a `np-notfound` root, the title, the markdown body, and a `:::actions` row the author writes. Nothing is hard coded in the renderer beyond the root class.
3. nimpress: the build writes the page as `404.html` at the root of `paths.out` in addition to its route, so GitHub Pages and every static host that reads `404.html` serve it. The router resolves an unknown in app route to the same page when one exists, and to the current fallback when none exists.
4. nimpress: the page stays out of the sidebar and out of search unless `sidebar` places it, and it never appears in the sitemap.
5. nimpress: write `docs/404.md` as this site's not found page and `docs/page-types/404.md` in the docs shape: definition paragraph, `## Frontmatter`, `## Where it is served`, `## Restyling`. Add the type to the rule files and the decision tree, the classes to `docs/styling/page-types.md`, and the `## Not found page` section to the changelog entry.
6. verify: `just build && just check && node bin/nimpress.mjs lint && node bin/nimpress.mjs build && test -f dist/site/404.html`

## Done when
`dist/site/404.html` exists after `node bin/nimpress.mjs build` and an unknown route in `just dev` renders the page.

## Summary
