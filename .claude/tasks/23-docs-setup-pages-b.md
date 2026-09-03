---
id: 23
parent: 18
relations: [5, 14, 15]
title: Setup pages: header, footer, repository, analytics, tags, offline, seo, theming, auth
type: Task
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:55Z
updated_at: 2026-09-03T11:36:19Z
questions: []
---

## Intent
The second half of the zensical Setup section: header, footer, repository, analytics, tags, offline, and the rewritten seo, theming, and auth pages. Each opens with the zensical definition sentence and maps to nimpress config and frontmatter fields.

## Scope
`docs/setup/header.md`, `footer.md`, `repository.md`, `analytics.md`, `tags.md`, `offline.md`, and the rewritten `seo.md`, `theming.md`, `auth.md`. Nothing under `src/`. Pages whose feature lands in tasks 5, 14, and 15 are written after those land; the relations say so.

## Order
1. nimpress: `header.md`: "The header can be customized to show an announcement bar that disappears upon scrolling, and provides some options for further configuration." Configuration covers `title`, `logo`, `github`, `navRoutes`, and `announce` with `### Announcement bar` and `### Mark as read` from task 14.
2. nimpress: `footer.md`: "The footer of your documentation hosts the copyright notice, links to the previous and next page, as well as links to your social media profiles." Configuration covers the `footer` object from task 14 with `### Navigation`, `### Social links` and its property table, `### Copyright notice`, `### Generator notice`. Usage covers `### Hiding prev/next links`.
3. nimpress: `repository.md`: "If your documentation is related to source code, nimpress provides the ability to display information about the project's repository as part of the static site." Configuration covers `repo` from task 15 with `### Repository URL`, `### Content actions`, `### edit_uri` named `### Edit uri`.
4. nimpress: `analytics.md`: Configuration covers the `client` module hook and the feedback widget from task 15 with `### Was this page helpful?`; Usage `### Hide the feedback widget`; Customization `### Custom site analytics` and `### Custom site feedback`. Google Analytics is not integrated; the page shows the client module wiring instead.
5. nimpress: `tags.md`: "nimpress adds first-class support for categorizing pages with tags, which allows users to discover related pages via search." Configuration covers the tag icons from task 5, Usage `### Add tags` and `### Hide tags on a page`.
6. nimpress: `offline.md`: "In order to build documentation and either offer it as a download or ship it with your product, nimpress can ensure that site search works even when accessed from the file system." Documents what works from `file://` with the current build and what does not; if search does not work from the file system, say so under `## Limitations` and leave Configuration out.
7. nimpress: `seo.md`, `theming.md`, `auth.md` keep their content and take the skeleton with a definition paragraph each.
8. verify: `node bin/nimpress.mjs lint`

## Done when
Lint passes and the nine pages sit under Setup in the sidebar.

## Summary
