# docs-sync

Wire a repo onto the central docs pipeline so its `.nimpress` docs ship to `nimling/samna` on a version tag.

When the user asks to connect a repo to the docs site, or to set up docs sync, run these steps in order. Stop on the first failure and surface it.

## 1. Add the content folder

Create `.nimpress/index.md` at the repo root if it does not exist, with valid frontmatter:

```md
---
title: <App name>
description: <One sentence on what this app is>
---

## Overview

<Short intro>
```

Add more pages and a `changelog` folder as needed, following the nimpress authoring rules.

## 2. Add the consumer workflow

Write `.github/workflows/docs.yml`:

```yaml
name: Publish docs

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: changed
        shell: bash
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "changed=true" >> "$GITHUB_OUTPUT"; exit 0
          fi
          prev=$(git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | grep -v "^${GITHUB_REF_NAME}$" | head -1)
          if [ -z "$prev" ] || git diff --name-only "$prev" "${GITHUB_REF_NAME}" -- .nimpress | grep -q .; then
            echo "changed=true" >> "$GITHUB_OUTPUT"
          else
            echo "changed=false" >> "$GITHUB_OUTPUT"
          fi
      - if: steps.changed.outputs.changed == 'true'
        id: app
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
          owner: nimling
          repositories: samna
      - if: steps.changed.outputs.changed == 'true'
        uses: nimling/nimpress/actions/docs-notify@v1
        with:
          docs-repo: nimling/samna
          token: ${{ steps.app.outputs.token }}
```

## 3. Ignore the key

Ensure `.gitignore` contains `*.pem`.

## 4. Print the manual steps for the user

These need the org owner or an admin, state them and do not attempt them silently:

1. Install the shared docs App on this repo.

2. Set `APP_ID` and `APP_PRIVATE_KEY` on this repo. The private key is the `.pem` from the App settings Private keys section. Command form:

```bash
gh secret set APP_ID -R <owner>/<repo> -b "<id>"
gh secret set APP_PRIVATE_KEY -R <owner>/<repo> < github.pem
```

3. Add a mapping entry to `nimpress.sources.json` at the docs repo root:

```json
"<owner>/<repo>": { "target": "<section>/<name>", "mode": "mirror", "publish": "pr" }
```

Set `publish` to `auto` to commit to `branch`, default main, and ship a version, or `pr` to open a review pull request. An optional `prTemplate` is a Go template for the pull request body with `.Repo`, `.Target`, `.Added`, `.Modified`, and `.Deleted`.

## 5. Trigger and verify

1. Run `gh workflow run docs.yml -R <owner>/<repo>` or cut a version tag.

2. Watch the notify run, then the `docs-sync` run on the docs repo, then confirm the `docs-sync/<owner>/<repo>` pull request.

## Notes

1. The pull request step on the receiver must use the App token, since an org setting can block the default token from creating pull requests.

2. The docs version tracks the app version, so publishing happens on a tag, not on every commit.
