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

## The two actions

`docs-notify` runs in the source repo and dispatches the docs site.

| Input | Required | Purpose |
|-------|----------|---------|
| `docs-repo` | yes | Full name of the docs site repo, for example `nimling/samna` |
| `token` | yes | A token with repository dispatch access to the docs site |
| `event-type` | no | Dispatch type, defaults to `nimpress-docs-sync` |

`docs-sync` runs in the docs site repo, driven by the dispatch. The receiver workflow checks out the docs and the source first, then hands the paths to the action, which mirrors, renders the templates, bumps the version files, and commits and tags or opens a pull request.

| Input | Required | Purpose |
|-------|----------|---------|
| `token` | yes | A token that can push to the docs repo and open pull requests |
| `docs-repo` | yes | Full name of the docs repo |
| `docs-dir` | yes | Path to the checked out docs repo |
| `source-repo` | yes | Full name of the source repo |
| `source-path` | yes | Path to the checked out `.nimpress` folder |
| `content-root` | yes | Path to the docs content root the targets resolve under |
| `mapping` | no | Path to `nimpress.sources.json` |
| `defaults` | no | A json config object applied under each source |

Its `result` output is `pushed`, `pr`, or `none`.

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

5. `target` is the short form for a single location. To split one repo across several docs paths, use `targets`, an array of `{ from, to, mode }`, where `from` is a subfolder of `.nimpress`. A repo can send its generated api to `api/<name>` and its prose to `solutions/<name>` in one run.

```json
"targets": [
  { "from": "api", "to": "api/bookable" },
  { "from": "docs", "to": "solutions/bookable" }
]
```

## The GitHub App

A single organization GitHub App carries the cross repo trust, installed on the source repos and the docs repo with Contents read and write, Pull requests read and write, and Metadata read. Both workflows mint a token from it with `actions/create-github-app-token`. The action pushes and opens pull requests with that token. The pull request must use the App token, since an organization setting can forbid the default Actions token from creating pull requests, and the version tag must be pushed by the App token so the deploy fires.

## Secrets

The whole pipeline runs on that one App plus a packages token. Set them once per repo.

Source repo, any repo that publishes its own docs:

1. `APP_ID` is the App's numeric id.

2. `APP_PRIVATE_KEY` is the App's private key, the `.pem` from the App settings Private keys section. The consumer workflow mints a token from these two and hands it to `docs-notify`, which dispatches the docs site.

Docs site repo, `nimling/samna`:

1. `APP_ID` and `APP_PRIVATE_KEY` are the same App. `docs-sync` mints a token from these to check out the docs and the source at the tagged commit, push the sync, and open pull requests.

2. `PACKAGES_TOKEN` is a token with `read:packages`. The deploy workflow installs `@nimling/nimpress` from GitHub Packages with it before `nimpress build`, because the default Actions token cannot read a package owned by a sibling repo.

Set each secret with `gh secret set APP_ID -R <owner>/<repo> -b "<id>"` and `gh secret set APP_PRIVATE_KEY -R <owner>/<repo> < app.pem`.

## Without the App, a dispatch token

The App is the primary path and the one that runs today. A source repo that will not install the App can dispatch with a token instead. Set `NIMPRESS_DOCS_TOKEN` on the source repo to a personal access token with repository dispatch access to the docs site, and call `docs-notify@v1` with `token: ${{ secrets.NIMPRESS_DOCS_TOKEN }}`. The file `actions/consumer-workflow.example.yml` is that form, triggered on a push to `main` touching `.nimpress/**` rather than on a version tag.

This swaps only the notify step. The docs receiver still authenticates with the App to check out both repos, push, and open pull requests. A source entry in `nimpress.sources.json` may carry an optional `secret` naming a docs repo secret to use for that source's checkout, with `NIMPRESS_SYNC_TOKEN` as the conventional name, for a receiver wired to read it instead of the App.

`PACKAGES_TOKEN` is unaffected by this choice. It is a `read:packages` token for the build, not part of the sync auth, so the docs repo needs it either way.

## The deploy

The version tag that `docs-sync` pushes into the docs repo triggers that repo's deploy workflow, which runs `nimpress build` and publishes the static site to GitHub Pages. Nothing else fires the deploy, so the live site version tracks each sync. This is why the tag has to be pushed by the App token and why the docs repo carries `PACKAGES_TOKEN` for the build.

## Onboarding a new app

1. Add a `.nimpress` folder with the markdown for that app.

2. Add the consumer workflow at `.github/workflows/docs.yml`. It triggers on a version tag, guards on `.nimpress` changes, mints the App token, and calls `docs-notify@v1`. The skill named docs-sync scaffolds it.

3. Set `APP_ID` and `APP_PRIVATE_KEY` on the repo and install the App on it.

4. In the docs repo, add a source to `nimpress.sources.json`, or configure it through the receiver's `defaults` input.

## What not to do

1. Do not commit a synced subtree by hand. The action owns `tools/<repo>` and similar targets.

2. Do not publish on every push. The trigger is a version tag, so the docs version tracks the app version.
