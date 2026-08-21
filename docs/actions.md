---
title: Publishing a repo's docs to the central site
description: How any nimling repo ships its own docs into the central docs site through the nimpress docs-sync action on a version tag.
order: 1
sidebar:
  name: Pipeline
---

A repo keeps its documentation next to its code in an export folder, `.nimpress` by default and named by the `export-dir` input, or, in a nimpress repo, marks individual pages with an `export:` frontmatter header. On a version tag the nimpress pipeline mirrors the folder or the marked pages into the central docs site under a mapped path. The `docs-sync` action owns the whole publish flow with no other dependencies, so a consumer pipeline is just checkout, token, run.

## The export header

A nimpress repo needs no export folder. Any page whose frontmatter carries `export: <target>` is published, `export: true` matches every target. The `docs-export` action, or `nimpress export` locally, collects each marked page's folder, the page, its stories, its `schema.json`, into an output tree, dropping the `export:` and `data.file` lines and stamping `data.version` from the source package version so component pages land in package mode. That output tree is what `docs-sync` mirrors, so the rest of the flow is identical to the export folder path.

## How the flow runs

1. A repo pushes a version tag such as `v1.4.0`.

2. The consumer workflow checks whether the export folder changed since the previous version tag. If nothing changed it stops.

3. It mints a token from the shared GitHub App and calls `docs-notify`, which sends a repository dispatch to the docs site with the source repo and the tagged commit. The notify guard accepts either the export folder or export marked pages, and the dispatch payload carries `mode: nimpress` or `mode: export` along with the `export_dir` it resolved.

4. The docs receiver checks out the docs and the source, then runs `docs-sync`. When the payload mode is `export` it runs `docs-export` first and hands its output tree to `docs-sync` as the source path. The action mirrors into the mapped subtree, bumps any configured version files, then either commits and tags or opens a pull request.

5. With `publish: auto` it commits to the configured branch and pushes the version tag, which triggers the deploy. On a push conflict it falls back to a pull request. With `publish: pr` it always opens a pull request, with a title, body, and labels from the source's Go templates.

## The three actions

`docs-notify` runs in the source repo and dispatches the docs site.

| Input | Required | Purpose |
|-------|----------|---------|
| `docs-repo` | yes | Full name of the docs site repo, for example `nimling/docs-site` |
| `token` | yes | A token with repository dispatch access to the docs site |
| `event-type` | no | Dispatch type, defaults to `nimpress-docs-sync` |
| `content-dir` | no | Content root scanned for export marked pages when the export folder is absent, defaults to `docs` |
| `export-dir` | no | Folder holding the pages to publish, relative to the repo root, defaults to `.nimpress` |

`docs-export` runs in the docs site repo before `docs-sync` when the dispatch mode is `export`, against the checked out source repo.

| Input | Required | Purpose |
|-------|----------|---------|
| `source-dir` | yes | Path to the checked out source repo |
| `content-dir` | no | Content root inside the source repo, defaults to `docs` |
| `target` | no | Export target name the header must match, empty accepts every marked page |
| `out` | yes | Output folder handed to `docs-sync` as `source-path` |

Its `count` output is the number of exported pages.

`docs-sync` runs in the docs site repo, driven by the dispatch. The receiver workflow checks out the docs and the source first, then hands the paths to the action, which mirrors, renders the templates, bumps the version files, and commits and tags or opens a pull request.

| Input | Required | Purpose |
|-------|----------|---------|
| `token` | yes | A token that can push to the docs repo and open pull requests |
| `docs-repo` | yes | Full name of the docs repo |
| `docs-dir` | yes | Path to the checked out docs repo |
| `source-repo` | yes | Full name of the source repo |
| `source-path` | yes | Path to the checked out export folder |
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

5. `target` is the short form for a single location. To split one repo across several docs paths, use `targets`, an array of `{ from, to, mode }`, where `from` is a subfolder of the export folder. A repo can send its generated api to `api/<name>` and its prose to `solutions/<name>` in one run.

```json
"targets": [
  { "from": "api", "to": "api/bookable" },
  { "from": "docs", "to": "solutions/bookable" }
]
```

## The GitHub App

A single organization GitHub App carries the cross repo trust, installed on the source repos and the docs repo with Contents read and write, Pull requests read and write, and Metadata read. Both workflows mint a token from it with `actions/create-github-app-token`. The action pushes and opens pull requests with that token. The pull request must use the App token, since an organization setting can forbid the default Actions token from creating pull requests, and the version tag must be pushed by the App token so the deploy fires.

## Secrets

The whole pipeline runs on that one App. Set the two secrets once per repo.

Source repo, any repo that publishes its own docs:

1. `APP_ID` is the App's numeric id.

2. `APP_PRIVATE_KEY` is the App's private key, the `.pem` from the App settings Private keys section. The consumer workflow mints a token from these two and hands it to `docs-notify`, which dispatches the docs site.

Docs site repo, `nimling/docs-site`:

1. `APP_ID` and `APP_PRIVATE_KEY` are the same App. `docs-sync` mints a token from these to check out the docs and the source at the tagged commit, push the sync, and open pull requests.

`@nimtech/nimpress` is public on npm, so the docs repo installs it with no registry configuration and no token.

Set each secret with `gh secret set APP_ID -R <owner>/<repo> -b "<id>"` and `gh secret set APP_PRIVATE_KEY -R <owner>/<repo> < app.pem`.

## Without the App, a dispatch token

The App is the primary path and the one that runs today. A source repo that will not install the App can dispatch with a token instead. Set `NIMPRESS_DOCS_TOKEN` on the source repo to a personal access token with repository dispatch access to the docs site, and call `docs-notify@v2` with `token: ${{ secrets.NIMPRESS_DOCS_TOKEN }}`. The file `actions/consumer-workflow.example.yml` is the workflow in full, with the export folder held in one `EXPORT_DIR` variable that both the change guard and the `export-dir` input read.

This swaps only the notify step. The docs receiver still authenticates with the App to check out both repos, push, and open pull requests. A source entry in `nimpress.sources.json` may carry an optional `secret` naming a docs repo secret to use for that source's checkout, with `NIMPRESS_SYNC_TOKEN` as the conventional name, for a receiver wired to read it instead of the App.

## The deploy

The version tag that `docs-sync` pushes into the docs repo triggers that repo's deploy workflow, which runs `nimpress build` and publishes the static site to GitHub Pages. Nothing else fires the deploy, so the live site version tracks each sync. This is why the tag has to be pushed by the App token.

## Onboarding a new app

1. Add an export folder with the markdown for that app, `.nimpress` unless the workflow names another with `export-dir`.

2. Add the consumer workflow at `.github/workflows/docs.yml`. It triggers on a version tag, guards on export folder changes, mints the App token, and calls `docs-notify@v2`. The skill named docs-sync scaffolds it.

3. Set `APP_ID` and `APP_PRIVATE_KEY` on the repo and install the App on it.

4. In the docs repo, add a source to `nimpress.sources.json`, or configure it through the receiver's `defaults` input.

## What not to do

1. Do not commit a synced subtree by hand. The action owns `tools/<repo>` and similar targets.

2. Do not publish on every push. The trigger is a version tag, so the docs version tracks the app version.
