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

Run these in order from the repo root. Stop on the first failure and surface the error verbatim; a failing build or type check blocks the release and nothing is committed.

1. The publish workflow needs the GitHub Actions secret `NPM_TOKEN` on this repo, an npm automation token that can publish under the `@nimtech` scope; it is consumed as `NODE_AUTH_TOKEN` for the registry step. Nothing else: `pnpm install` resolves every dependency from the public registry.

2. `just build`, `pnpm run build:lib` under the hood. Emits `dist/nimpress.es.js`, `dist/plugin.es.js`, `dist/tailwind.preset.js`, `dist/style.css` and `dist/*.d.ts`.

3. `just check`, `svelte-check` plus `tsc -p tsconfig.node.json`.

4. Stage every changed file relevant to the release, commit with a single sentence describing the user visible change, and `git push`. With nothing to commit, still push so the bump pushes a clean ref. The message rules are `~/.claude/rules/git.md`.

5. `just deploy`, which runs `sbump patch --json package.json@.version --push-version --auto --workflow`: patch bump, tag write, tag push, and the three workflows the tag starts. `just deploy-minor` or `just deploy-major` for a larger bump.
