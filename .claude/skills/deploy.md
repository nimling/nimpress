# deploy

Ship a new version of `@nimtech/nimpress` to npm.

When the user says "deploy" in this repo, execute these steps in order. Stop on the first failure and surface the error.

## Prerequisites

1. GitHub Actions secret named `NPM_TOKEN` set on this repo, an npm automation token that can publish under the `@nimling` scope. The publish workflow consumes it as `NODE_AUTH_TOKEN` for the npm registry step.

2. Nothing else. `pnpm install` resolves every dependency from the public registry.

## 1. Build the library

```
just build
```

`pnpm run build:lib` under the hood. Emits `dist/nimpress.es.js`, `dist/plugin.es.js`, `dist/tailwind.preset.js`, `dist/style.css`, and `dist/*.d.ts`.

Failure: report the build output and stop. Do not commit.

## 2. Type check

```
just check
```

`svelte-check` plus `tsc -p tsconfig.node.json`. Failure: report the offending errors and stop.

## 3. Commit and push

Stage every changed file relevant to the release. Write a single sentence describing the user visible change. Push to `origin/main`.

```
git add -A
git commit -m "<one sentence describing the change>"
git push
```

If the working tree has nothing to commit, skip the commit but still push so the bump in the next step pushes a clean ref.

## 4. Bump and tag

```
just deploy
```

Calls `sbump patch --json package.json@.version --push-version --auto --workflow`. Patch bump, tag write, tag push. The tag starts three workflows: `publish.yml` publishes the package to npm, `pages.yml` builds `docs/` and deploys it to GitHub Pages, and `release-actions.yml` validates the Go actions and moves the major tag.

For minor or major releases use `just deploy-minor` or `just deploy-major` instead.

## Never

1. Skip steps 1 or 2. A failing build or failing type check must block the deploy.

2. Edit `package.json` `version` by hand. `sbump` owns that field.

3. Use `--no-verify` or `--no-gpg-sign`.

4. Run `pnpm publish` directly. The tag pushed by `just deploy` triggers the workflow that publishes.
