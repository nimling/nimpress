# Docs sync pipeline

Rules for wiring a repo's docs into the central docs site through the nimpress actions. The actions live in `nimling/nimpress/actions`, the docs site is `nimling/samna`, and the shared GitHub App carries the cross repo trust.

## The shape

1. A source repo keeps its docs in a `.nimpress` folder at its root. That folder is the content that syncs.

2. The source repo has a consumer workflow `.github/workflows/docs.yml` that triggers on a version tag, not on a branch push, and guards on whether `.nimpress` changed since the previous version tag.

3. The docs site has the receiver `.github/workflows/docs-sync.yml` and the mapping `nimpress.sources.json` at its root.

## Consumer workflow

1. Trigger is `on: push: tags: ['v*']` plus `workflow_dispatch`. Never trigger docs publish on a plain branch push.

2. A guard step compares `.nimpress` between the current tag and the previous version tag with `git diff`, and the notify runs only when it changed. A `workflow_dispatch` always counts as changed.

3. Mint the token with `actions/create-github-app-token` using `app-id: secrets.APP_ID`, `private-key: secrets.APP_PRIVATE_KEY`, `owner: nimling`, and `repositories: samna`. Pass `steps.app.outputs.token` to `docs-notify`.

4. Call `nimling/nimpress/actions/docs-notify@v1` with `docs-repo: nimling/samna`.

## Receiver workflow

1. Listens on `repository_dispatch` type `nimpress-docs-sync` and `workflow_dispatch`.

2. Mints an organization App token, no `repositories` filter, so it can read any source repo and open pull requests.

3. Checks out the source at the dispatched sha using the App token, runs `docs-sync@v1` to mirror, installs with `NODE_AUTH_TOKEN: secrets.PACKAGES_TOKEN`, then runs `nimpress lint`.

4. The pull request step passes `token: steps.app.outputs.token`. This is required, because an organization setting can forbid the default Actions token from creating pull requests, and the App token bypasses that.

## Mapping

1. `nimpress.sources.json` maps each source repo to a `target` under the content root and a `mode` of `mirror` or `overlay`. Mirror makes the source the sole owner of that subtree.

2. `publish` on each source is `auto` or `pr`. `auto` commits to `branch`, default main, and ships a version. `pr` opens a review pull request on `docs-sync/<owner>/<repo>`.

3. `prTemplate` is an optional Go template for the pull request body, with `.Repo`, `.Target`, `.Added`, `.Modified`, and `.Deleted` available. A default body is used when it is absent.

4. An optional `secret` on a source names a docs repo secret to use for that checkout instead of the App token.

## Secrets and the App

1. The shared App is installed on each source repo and the docs repo with Contents read and write, Pull requests read and write, Metadata read.

2. Each source repo and the docs repo carry `APP_ID` and `APP_PRIVATE_KEY`. The private key is the `.pem` from the App settings Private keys section. The docs repo also carries `PACKAGES_TOKEN`.

3. Never commit a private key. Keep `*.pem` in `.gitignore`.

## What is wrong if you see it

1. A consumer workflow triggered on a branch push or a `.nimpress` path push rather than a version tag.

2. A pull request step using the default token. It fails with "GitHub Actions is not permitted to create or approve pull requests". Use the App token.

3. A hand committed `tools/<repo>` subtree. The pipeline owns it.

4. A `.pem` tracked in git.
