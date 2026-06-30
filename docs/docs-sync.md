---
title: Publishing a repo's docs to the central site
description: How any nimling repo ships its own docs into the central docs site through the nimpress docs-sync action on a version tag.
---

A repo keeps its documentation next to its code in a `.nimpress` folder. On a version tag the nimpress pipeline mirrors that folder into the central docs site under a mapped path. The `docs-sync` action owns the whole publish flow with no other dependencies, so a consumer pipeline is just checkout, token, run.

## How the flow runs

1. A repo pushes a version tag such as `v1.4.0`.

2. The consumer workflow checks whether `.nimpress` changed since the previous version tag. If nothing changed it stops.

3. It mints a token from the shared GitHub App and calls `docs-notify`, which sends a repository dispatch to the docs site with the source repo and the tagged commit.

4. The docs receiver checks out the docs and the source, then runs `docs-sync`. The action mirrors `.nimpress` into the mapped subtree, bumps any configured version files, then either commits and tags or opens a pull request.

5. With `publish: auto` it commits to the configured branch and pushes the version tag, which triggers the deploy. On a push conflict it falls back to a pull request. With `publish: pr` it always opens a pull request, with a title, body, and labels from the source's Go templates.

## Configuration in two places

The action accepts a `defaults` json object, and `nimpress.sources.json` holds the same shape per source. The result is `defaults` merged with the matching source, the source winning field by field. Either alone can fully configure a source.

```json
{
  "target": "tools/nimpress",
  "mode": "mirror",
  "publish": "auto",
  "branch": "main",
  "commit": { "message": "Sync docs from {{.Repo}}" },
  "pullRequest": {
    "title": "Docs from {{.Repo}}",
    "body": "{{len .Added}} added, {{len .Modified}} modified, {{len .Deleted}} deleted.",
    "labels": ["documentation"]
  },
  "version": {
    "files": ["package.json@.version"],
    "tag": "v{{.Version}}"
  }
}
```

1. `target` is a path under the docs content root. `mode` is `mirror` or `overlay`. Mirror makes the source the sole owner of that subtree.

2. `publish` is `auto` or `pr`. `branch` defaults to main.

3. `commit.message`, `pullRequest.title`, `pullRequest.body`, and each label are Go templates with `.Repo`, `.Target`, `.Branch`, `.Version`, `.Added`, `.Modified`, `.Deleted`.

4. `version.files` lists files to patch bump in the sbump path form. `version.tag` is the tag template. The action bumps each file, commits with the sync, and pushes the tag, which triggers the deploy on its own.

## The GitHub App

A single organization GitHub App carries the cross repo trust, installed on the source repos and the docs repo with Contents read and write, Pull requests read and write, and Metadata read. Both workflows mint a token from it with `actions/create-github-app-token`. The action pushes and opens pull requests with that token. The pull request must use the App token, since an organization setting can forbid the default Actions token from creating pull requests, and the version tag must be pushed by the App token so the deploy fires.

## Onboarding a new app

1. Add a `.nimpress` folder with the markdown for that app.

2. Add the consumer workflow at `.github/workflows/docs.yml`. It triggers on a version tag, guards on `.nimpress` changes, mints the App token, and calls `docs-notify@v1`. The skill named docs-sync scaffolds it.

3. Set `APP_ID` and `APP_PRIVATE_KEY` on the repo and install the App on it.

4. In the docs repo, add a source to `nimpress.sources.json`, or configure it through the receiver's `defaults` input.

## What not to do

1. Do not commit a synced subtree by hand. The action owns `tools/<repo>` and similar targets.

2. Do not publish on every push. The trigger is a version tag, so the docs version tracks the app version.
