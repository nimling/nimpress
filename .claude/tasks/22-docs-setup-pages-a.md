---
id: 22
parent: 18
relations: [10, 17]
title: Setup pages: basics, colors, fonts, logo and icons, navigation, validation, search, sidebar
type: Task
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:55Z
updated_at: 2026-09-03T11:36:20Z
questions: []
---

## Intent
The first half of the zensical Setup section: basics, colors, fonts, logo and icons, navigation, validation, search, and the sidebar page. Each page opens with the zensical definition sentence, then Configuration, Usage, Customization, mapped to the nimpress config fields and frontmatter fields that already exist.

## Scope
`docs/setup/basics.md`, `colors.md`, `fonts.md`, `logo-and-icons.md`, `navigation.md`, `validation.md`, and the rewritten `search.md` and `sidebar.md`. Nothing under `src/`. A feature nimpress does not have is left out of the page.

## Order
1. nimpress: `basics.md` is the config field reference from `NimpressUserConfig` in `src/types.ts:500`: "A nimpress project is configured via a nimpress.config file." One `## <field>` per field with its doc comment expanded to a paragraph, the default, and an example, in the order the type declares them.
2. nimpress: `colors.md`: "nimpress allows to change the color palette of your documentation site through configuration to fit your brand's identity." Configuration covers the `brand` config field, the color scheme toggle, and system preference. Customization covers overriding tokens from `docs/theming.md`, which becomes the token reference this page links to.
3. nimpress: `fonts.md`: "nimpress makes it easy to change the typeface of your project documentation." Configuration covers the font tokens; Customization covers a `@font-face` in the site css.
4. nimpress: `logo-and-icons.md`: Configuration covers `logo`, the favicon through `meta`, and `sidebar.icon` forms; Customization covers custom svg icons. Once task 17 has landed the shortcode resolver is documented here.
5. nimpress: `navigation.md`: "A clear and concise navigation structure is an important aspect of good project documentation." Configuration maps each zensical flag to what nimpress does: sections from the folder tree, expansion through `collapsed`, breadcrumbs always on, back to top always on, the rail following the active anchor, anchor tracking through the hash spy, section index pages through folder `index.md`, and `navRoutes` as the tabs equivalent. Usage covers `hide` once task 10 has landed. Customization covers the content width tokens.
6. nimpress: `validation.md`: "Broken links are easy to miss – pages get renamed or moved, and references silently stop working." Documents what `nimpress lint` checks, from the lint section of the skill, one H3 per check, and `## Strict mode` if lint has a flag for it, else omitted.
7. nimpress: `search.md` and `sidebar.md` keep their content and take the skeleton and the definition sentences: "nimpress offers seamless client-side search functionality, eliminating the need to integrate third-party services" and the navigation sentence above.
8. verify: `node bin/nimpress.mjs lint`

## Done when
Lint passes and the eight pages sit under Setup in the sidebar.

## Summary
