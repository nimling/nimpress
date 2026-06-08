# deploy

Ship a new version of `@nimling/nimpress` to GitHub Packages.

When the user says "deploy" in this repo, execute these steps in order. Stop on the first failure and surface the error.

## Prerequisites

1. Local `.env` at the repo root with `NODE_AUTH_TOKEN=<personal access token with read:packages>`. The justfile loads it via `set dotenv-load` so `pnpm install` can resolve `@nimling/samna-auth-middleware`.

2. GitHub Actions secret named `PACKAGES_TOKEN` set on this repo. The publish workflow consumes it as `NODE_AUTH_TOKEN`. A default `GITHUB_TOKEN` is not enough because the workflow needs read access to a package owned by a sibling repo.

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

Calls `../sbump/sbump.sh patch --json package.json@.version --push-version --auto`. Patch bump, tag write, tag push. The GitHub Actions workflow at `.github/workflows/publish.yml` picks up the tag and publishes to GitHub Packages.

For minor or major releases use `just bump:minor` or `just bump:major` instead and push the tag with `git push origin --tags`.

## Never

1. Skip steps 1 or 2. A failing build or failing type check must block the deploy.

2. Edit `package.json` `version` by hand. `sbump` owns that field.

3. Use `--no-verify` or `--no-gpg-sign`.

4. Run `pnpm publish` directly. The tag pushed by `just deploy` triggers the workflow that publishes.
