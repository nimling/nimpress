---
id: 5
parent: 1
relations: [23]
title: The tags type lists every tag with its pages and every page shows its tags
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:53Z
updated_at: 2026-09-03T11:36:18Z
questions: []
---

## Intent
Zensical: "first-class support for categorizing pages with tags, which allows users to discover related pages via search." Tags render at the bottom of every page, each tag carries an icon, and one page lists every tag with its pages. nimpress reads `tags` into the search index only. `type: tags` is the listing page, and every page shows its tags.

## Scope
`src/types.ts` PageType. `src/plugin.ts` schema and manifest, so the tag set and the pages per tag are built once. `src/markdown/TagsPage.svelte` new. `src/markdown/Page.svelte` for the tag row at the bottom of a doc page. `src/index.ts`. `docs/page-types/tags.md`, `docs/tags.md` as this site's listing, the rule files, `docs/styling/page-types.md`, `docs/changelog/v2.4.0.md`. Search scoring in `src/search/` is not touched.

## Order
1. nimpress: add `tags` to `PageType` and the schema union. The plugin builds a tag index into the manifest: every distinct tag, its pages with title, route, and description, and its icon.
2. nimpress: a `tags` block in the nimpress config maps a tag to an identifier and an identifier to an icon, the same two step shape zensical uses so a group of tags shares one icon: `tags: { icons: { default: '...', html: '...' }, map: { HTML5: 'html' } }`. An icon accepts the same three forms `sidebar.icon` accepts. Add the fields to `NimpressUserConfig` and `ResolvedNimpressConfig` in `src/types.ts` with a doc comment each.
3. nimpress: `Page.svelte` renders a `np-tags` row under the body with one `np-tag` pill per tag, icon then label, each linking to the listing page anchor `#<tag-slug>` when a `type: tags` page exists. The `hide` list from task 10 removes the row with `tags` when that task has landed; until then the row always renders.
4. nimpress: write `src/markdown/TagsPage.svelte`. It renders inside the doc shell with the rail. The body renders first, then one `## <tag>` section per tag with the icon, holding a `np-tags-list` of the pages. The rail lists the tags.
5. nimpress: search results already show matched tags as pills; keep that and give the pills the same `np-tag` class.
6. nimpress: write `docs/tags.md` as this site's tag listing and `docs/page-types/tags.md` in the docs shape: definition paragraph with the zensical sentence, `## Configuration` for the icons block ending with "Add the following lines to your configuration:", `## Usage` with `### Add tags` and `### Hide tags on a page`, `## Restyling`. Add the type to the rule files, the decision tree, the config fields to `docs/getting-started.md`, and the classes to `docs/styling/page-types.md`. Write the `## Tags` changelog section.
7. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
`node bin/nimpress.mjs lint` passes and `/tags` lists every tag used under `docs/` with its pages.

## Summary
