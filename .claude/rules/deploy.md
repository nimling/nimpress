# Deploy

The release pipeline for `@nimling/nimpress`. Run from the repo root.

## Steps in order

1. `just build` to compile the library into `dist/`. Fail the deploy if the build fails.

2. `just check` to run `svelte-check` and `tsc`. Fail the deploy if type checks fail.

3. Stage and commit every changed file with a single sentence summarizing the release. Conventional commits are not required, the wording should describe the user visible change.

4. `git push` to `origin/main`.

5. `just deploy` to invoke `sbump` which bumps the patch version, writes the tag, and pushes both.

## Variants

1. Minor release: replace step 5 with `just bump:minor` followed by `git push origin --tags`. Wired in `package.json` scripts.

2. Major release: replace step 5 with `just bump:major` followed by `git push origin --tags`.

## Never

1. Never run `just deploy` without a clean build and clean type check first. A broken release is harder to roll back than to prevent.

2. Never push directly to a published version. `sbump` increments the version. Manual edits to `package.json` `version` are not how this repo ships.

3. Never bypass GPG signing or pre commit hooks. If the hook fails, fix the issue and retry.

4. Never deploy with uncommitted changes in the working tree. `sbump` writes a commit, the tree must already be at the state you want to ship.

5. Never run `pnpm publish` directly. The `just deploy` flow is the only sanctioned path.

## When the user says "deploy"

The `deploy` skill in `.claude/skills/deploy.md` lays out the exact commands. Execute it end to end, stopping only if a step fails. Surface errors verbatim, do not paper over them.
