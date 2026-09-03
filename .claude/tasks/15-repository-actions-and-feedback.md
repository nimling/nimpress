---
id: 15
parent: 9
relations: [23]
title: Edit and view actions per page and a was this page helpful widget
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
Zensical shows the repository beside the header and renders "code action buttons that allow a reader to navigate to the source code of the current page in a hosted repository", an edit and a view action, plus a feedback widget: "A simple feedback widget can be included at the bottom of each page, encouraging users to give instant feedback whether a page was helpful or not." nimpress has the header github link and `lastUpdated`. Pages gain edit and view actions and the feedback widget.

## Scope
`src/types.ts` config. `src/markdown/Page.svelte` for the action row and the widget, a new `src/markdown/Feedback.svelte`. `src/plugin.ts` for the source path per page in the manifest. `docs/getting-started.md`, `docs/styling/prose.md`, `docs/changelog/v2.4.0.md`.

## Order
1. nimpress: `repo` in the config takes `{ url, editUri, actions }`. `url` is the repository, defaulting to `github`. `editUri` is the path prefix to the content folder on the default branch, `edit/main/docs/` by default for GitHub. `actions` is an array holding `edit` and `view`. The manifest records each page's content path so the runtime can build the urls.
2. nimpress: `Page.svelte` renders a `np-page-actions` row at the top right of the content column with an edit pencil and a view eye when the actions are enabled, each linking to the built url and opening a new tab.
3. nimpress: `feedback` in the config takes `{ title, ratings: [{ icon, name, data, note }], onSubmit }`. The widget renders under the body as `np-feedback` with the title, one button per rating, and shows the rating's note after a click. The click dispatches a `nimpress:feedback` DOM event carrying `{ path, data }` so a site wires analytics in its `client` module; nothing is sent by nimpress itself. `hide` with `feedback` from task 10 removes it per page; add `feedback` to that list.
4. nimpress: write the repository and feedback config sections in `docs/getting-started.md` in the docs shape with the zensical sentences, usage `### Hide the feedback widget`, and customization `### Custom site feedback` showing the event listener. Add the classes to `docs/styling/prose.md`. Write the `## Page actions and feedback` changelog section.
5. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
Lint passes and the edit action on any docs page opens the file on GitHub in `just dev`.

## Summary
