---
id: 10
parent: 9
relations: [25, 22]
title: A hide list and a status field in frontmatter, replacing noToc everywhere
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:54Z
updated_at: 2026-09-03T11:36:19Z
questions: []
---

## Intent
Zensical hides page elements with one front matter list: `hide: [navigation, toc, path, footer, feedback, tags]`. nimpress has `noToc` alone. A `hide` list carries every element and `noToc` goes away everywhere. Zensical also marks a page with `status: new` or `status: deprecated` shown in the sidebar; nimpress gains the same field.

## Scope
`src/plugin.ts` frontmatterSchema at line 140 and every `noToc` read. `src/types.ts` Frontmatter. `src/markdown/Page.svelte:44` and `:257`, `src/markdown/ChangelogPage.svelte:255` and `:302`, and every other renderer reading `noToc`. `src/layout/Sidebar.svelte` and `SidebarNode.svelte` for the status mark. `docs/` every page carrying `noToc: true`. `docs/frontmatter.md`, `.claude/rules/frontmatter.md`, `.claude/rules/doc-pages.md`, `docs/styling/shell.md`, `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: add `hide` to the schema as an array of `navigation`, `toc`, `path`, `footer`, `tags`. `navigation` drops the sidebar column, `toc` the right rail, `path` the breadcrumbs, `footer` the page footer line, `tags` the tag row from task 5. Remove `noToc` from the schema, the types, and every renderer; every read becomes `hide` containing `toc`. Rewrite every `noToc: true` under `docs/` to `hide: [toc]`. Lint fails on `noToc`.
2. nimpress: add `status` to the schema as a string. The config gains `status: Record<string, string>` mapping an identifier to a label, with `new` as `Recently added` and `deprecated` as `Deprecated` present without configuration. The sidebar row shows a `np-sidebar-status` mark with the label as its title; `new` and `deprecated` carry their own class so a site can color them.
3. nimpress: `defaultFrontmatter` in the config already applies defaults per page; make sure `hide` merges as a list rather than replacing.
4. nimpress: rewrite the `hide` and `status` rows in `docs/frontmatter.md` and the frontmatter rule with the zensical sentences: "Use the hide front matter property to hide one or more elements of a page" with the value table, and "A status can be assigned to each page and displayed in the navigation sidebar." Add the sidebar status classes to `docs/styling/shell.md`. Write the `## Hide and status` changelog section.
5. verify: `just build && just check && node bin/nimpress.mjs lint && ! grep -rn noToc src docs`

## Done when
`grep -rn noToc src docs` finds nothing and lint passes.

## Summary
