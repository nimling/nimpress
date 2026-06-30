# Docs sync pipeline

Rules for wiring a repo's docs into the central docs site through the nimpress actions. The actions live in `nimling/nimpress/actions`, the docs site is `nimling/samna`, and the shared GitHub App carries the cross repo trust.

## The shape

1. A source repo keeps its docs in a `.nimpress` folder at its root. That folder is the content that syncs.

2. The source repo has a consumer workflow `.github/workflows/docs.yml` that triggers on a version tag, not on a branch push, and guards on whether `.nimpress` changed since the previous version tag.

3. The docs site has the receiver `.github/workflows/docs-sync.yml` and optionally the mapping `nimpress.sources.json` at its root.

## Consumer workflow

1. Trigger is `on: push: tags: ['v*']` plus `workflow_dispatch`. Never trigger docs publish on a plain branch push.

2. A guard step compares `.nimpress` between the current tag and the previous version tag with `git diff`, and the notify runs only when it changed. A `workflow_dispatch` always counts as changed.

3. Mint the token with `actions/create-github-app-token` using `app-id: secrets.APP_ID`, `private-key: secrets.APP_PRIVATE_KEY`, `owner: nimling`, and `repositories: samna`. Pass `steps.app.outputs.token` to `docs-notify@v1` with `docs-repo: nimling/samna`.

## Receiver workflow

The receiver is thin. The `docs-sync` action owns the mirror, the version bump, the commit and tag, and the pull request, with no other dependency.

1. Listens on `repository_dispatch` type `nimpress-docs-sync` and `workflow_dispatch`.

2. Mints an organization App token before checkout, then checks out the docs with that token and `fetch-depth: 0`, and checks out the source at the dispatched sha with the same token.

3. Runs `docs-sync@v1` with `token`, `docs-repo`, `docs-dir`, `source-repo`, `source-path`, `content-root`, and optionally `mapping` and `defaults`. Nothing else.

## Configuration

1. The action `defaults` input and each `nimpress.sources.json` source hold the same json shape: `target`, `mode`, `publish`, `branch`, `commit`, `pullRequest`, `version`. The result is `defaults` merged with the source, the source winning per field. Either alone can fully configure a source.

2. `commit.message`, `pullRequest.title`, `pullRequest.body`, and labels are Go templates with `.Repo`, `.Target`, `.Branch`, `.Version`, `.Added`, `.Modified`, `.Deleted`.

3. `publish` is `auto` or `pr`. `auto` commits to `branch`, default main, and on a push conflict falls back to a pull request. `pr` always opens one.

4. `version.files` are patch bumped in the sbump path form, and `version.tag` is pushed by the App token so the deploy fires on its own.

## Secrets and the App

1. The shared App is installed on each source repo and the docs repo with Contents read and write, Pull requests read and write, Metadata read.

2. Each source repo and the docs repo carry `APP_ID` and `APP_PRIVATE_KEY`. The private key is the `.pem` from the App settings Private keys section.

3. Never commit a private key. Keep `*.pem` in `.gitignore`.

## What is wrong if you see it

1. A consumer workflow triggered on a branch push rather than a version tag.

2. A receiver that commits, opens pull requests, or bumps versions in its own steps instead of letting the action do it.

3. A version tag pushed with the default token, which does not trigger the deploy. The App token must push it.

4. A hand committed `tools/<repo>` subtree. The action owns it.

5. A `.pem` tracked in git.
