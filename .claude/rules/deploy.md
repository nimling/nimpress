# Deploy

The release pipeline for `@nimtech/nimpress`. Run from the repo root.

## Steps in order

1. `just build` to compile the library into `dist/`. Fail the deploy if the build fails.

2. `just check` to run `svelte-check` and `tsc`. Fail the deploy if type checks fail.

3. Stage and commit every changed file with a single sentence summarizing the release. Conventional commits are not required, the wording should describe the user visible change.

4. `git push` to `origin/main`.

5. `just deploy` to invoke `sbump` which bumps the patch version, writes the tag, and pushes both.

## What the tag triggers

1. `Generate and publish nimpress` builds the library, runs the tests, and publishes the package to npm under the `@nimtech` scope. It is public, so a consumer installs it with no registry configuration and no token.

2. `Release nimpress actions` validates the Go actions and moves the major tag onto the release.

3. `Publish the docs site` builds `docs/` with the freshly built library and deploys it to GitHub Pages at `nimling.github.io/nimpress`. The site build writes into `dist/site` so it never clears the library output, and the `base` field in `nimpress.config.json` is what makes the project page path resolve.

A release that changes a user visible surface carries its changelog entry in `docs/changelog/` in the same commit, one file per release. The entry contract is in `changelog-entries.md`.

## Variants

1. Minor release: replace step 5 with `just deploy-minor`.

2. Major release: replace step 5 with `just deploy-major`.

## Never

1. Never run `just deploy` without a clean build and clean type check first. A broken release is harder to roll back than to prevent.

2. Never push directly to a published version. `sbump` increments the version. Manual edits to `package.json` `version` are not how this repo ships.

3. Never bypass GPG signing or pre commit hooks. If the hook fails, fix the issue and retry.

4. Never deploy with uncommitted changes in the working tree. `sbump` writes a commit, the tree must already be at the state you want to ship.

5. Never run `pnpm publish` directly. The `just deploy` flow is the only sanctioned path.

## When the user says "deploy"

The `deploy` skill in `.claude/skills/deploy.md` lays out the exact commands. Execute it end to end, stopping only if a step fails. Surface errors verbatim, do not paper over them.
