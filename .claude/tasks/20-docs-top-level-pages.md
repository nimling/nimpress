---
id: 20
parent: 18
relations: []
title: Create your site, publish your site, upgrade, and browser support pages
type: Task
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:55Z
updated_at: 2026-09-03T11:30:55Z
questions: []
---

## Intent
Zensical opens with Get started, Create your site, Publish your site, Customization, Upgrade, and Browser support. nimpress has `getting-started.md`. The four missing pages are written under `docs/get-started/`.

## Scope
`docs/get-started/create-your-site.md`, `docs/get-started/publish-your-site.md`, `docs/get-started/upgrade.md`, `docs/get-started/browser-support.md`, and `docs/get-started/index.md` rewritten in the skeleton. Nothing under `src/`.

## Order
1. nimpress: `index.md` keeps the install, scaffold, configure, and run content and opens with a definition paragraph in the zensical form: "nimpress is a Svelte 5 static site generator designed to simplify building and maintaining project documentation." Install has one `:::tabs` group per package manager once task 12 has landed, else one fence per manager.
2. nimpress: `create-your-site.md` follows the zensical page: "After you've installed nimpress, you can bootstrap your project documentation using the nimpress executable." Sections `## Configuration` saying the config has sensible defaults and a site can be a title alone, `## Preview as you write` with `nimpress dev`, `## Build your site` with `nimpress build`.
3. nimpress: `publish-your-site.md` follows the zensical page: "The great thing about hosting project documentation in a git repository is the ability to deploy it automatically when new changes are pushed." Sections `## GitHub Pages` with a complete workflow yaml that installs with pnpm, runs `nimpress build`, and deploys `dist` with the pages actions, the `base` field note from `docs/build-pipeline.md`, `## GitLab Pages` with the ci yaml, `## Other` naming the output folder and that any static host serves it. Link the cross repo flow to the actions page.
4. nimpress: `upgrade.md` follows the zensical page: "Check the changelog to identify the version you would like to upgrade to." Sections `## Versioning` stating semantic versioning and that a major bump renames public classes and tokens, `## Upgrade` with the pnpm command, `## Breaking changes` linking to the changelog entries marked breaking.
5. nimpress: `browser-support.md` follows the zensical page: "nimpress tries to support the largest possible range of browsers while making it easy to customize the theme using modern CSS features like custom properties." One table of supported browsers and the css features the tokens rely on.
6. verify: `node bin/nimpress.mjs lint`

## Done when
Lint passes and the four pages sit under Get started in the sidebar.

## Summary
