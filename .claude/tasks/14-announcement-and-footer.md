---
id: 14
parent: 9
relations: [23]
title: Header announcement bar and footer previous, next, social links, and copyright
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
Zensical: "The header can be customized to show an announcement bar that disappears upon scrolling" and "The footer of your documentation hosts the copyright notice, links to the previous and next page, as well as links to your social media profiles." nimpress has a header with a logo, nav routes, and a github link, and a one line footer string. The header gains an announcement bar and the footer gains previous and next links, social links, a copyright line, and a generator notice.

## Scope
`src/layout/Header.svelte`, `src/layout/App.svelte` for the footer region, a new `src/layout/Footer.svelte` and `src/layout/Announce.svelte`. `src/types.ts` config fields. `src/framework/configStore.ts`. `docs/getting-started.md` config section, `docs/styling/shell.md`, `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: `announce` in the config takes `{ text, link, dismiss }`. `text` is one markdown line rendered in a `np-announce` bar above the header. The bar leaves the viewport when the reader scrolls past the header and returns at the top. `dismiss: true` adds a close button; a dismissed text stays hidden until the text changes, keyed by a hash of the text in localStorage.
2. nimpress: `footer` in the config grows from a string to `{ text, copyright, social, navigation, generator }`. A plain string still means `text`. `copyright` is one line rendered beside the social links. `social` is an array of `{ icon, link, name }` with the icon in the three forms `sidebar.icon` accepts, and `name` as the link title. `navigation: true` renders previous and next page links in sidebar order above the footer line. `generator: false` removes the `Built with nimpress` line that renders when unset.
3. nimpress: write `src/layout/Footer.svelte` with `np-footer`, `np-footer-nav`, `np-footer-social`, `np-footer-copyright`, `np-footer-generator` classes and mount it under the content column in `App.svelte`. The per page `footer` frontmatter field keeps rendering its centered line above it. `hide` with `footer` from task 10 removes the previous and next links on that page.
4. nimpress: write the header and footer config sections in `docs/getting-started.md` in the docs shape with the zensical sentences, and the `### Hiding prev/next links` usage note. Add the classes to `docs/styling/shell.md`. Write the `## Announcement bar and footer` changelog section.
5. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
Lint passes and this site's config carries an announcement and a footer with a github social link that render in `just dev`.

## Summary
