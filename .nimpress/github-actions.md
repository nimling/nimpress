---
title: GitHub Actions
description: Publish a repo's docs into the central site through the nimpress actions on a version tag.
order: 5
---

A repo keeps its docs beside the code in a `.nimpress` folder. On a version tag the nimpress actions mirror that folder into the central docs site under a mapped path. The action owns the whole flow, so a consumer pipeline is checkout, token, run.

## The flow

1. A repo pushes a version tag such as `v1.4.0`.

2. The consumer workflow checks whether `.nimpress` changed since the previous version tag. If nothing changed it stops.

3. It mints a token from the shared GitHub App and calls `docs-notify`, which sends a repository dispatch to the docs site with the source repo and the tagged commit.

4. The docs receiver checks out the docs and the source, then runs `docs-sync`. The action mirrors `.nimpress` into the mapped subtree, bumps any configured version files, then commits and tags, or opens a pull request.

5. The version tag triggers the docs deploy on its own.

## docs-notify

Runs in the source repo. On a version tag, after the change guard passes, it dispatches the docs site with the source repo name and the commit sha.

| Input | Purpose |
|-------|---------|
| `docs-repo` | Full name of the docs site repo |
| `token` | A token with dispatch access to the docs site |
| `event-type` | Dispatch type, defaults to `nimpress-docs-sync` |

## docs-sync

Runs in the docs site repo, driven by the dispatch. It mirrors, renders the templates, bumps the version files, then commits and tags, or opens a pull request. It uses only git and the GitHub API, so the receiver needs nothing else.

| Input | Purpose |
|-------|---------|
| `token` | A token that can push and open pull requests |
| `docs-repo` | Full name of the docs repo |
| `docs-dir` | Path to the checked out docs repo |
| `source-repo` | Full name of the source repo |
| `source-path` | Path to the checked out `.nimpress` folder |
| `content-root` | Path to the docs content root |
| `mapping` | Path to `nimpress.sources.json`, optional |
| `defaults` | A json config object applied under each source, optional |

Its `result` output is `pushed`, `pr`, or `none`.

## Configuration

The `defaults` input and each `nimpress.sources.json` source hold the same shape, merged with the source winning per field. Either alone can configure a source.

```json
{
  "target": "tools/your-repo",
  "mode": "mirror",
  "publish": "auto",
  "branch": "main",
  "commit": { "message": "Sync docs from {{.Repo}}" },
  "pullRequest": {
    "title": "Docs from {{.Repo}}",
    "body": "{{len .Added}} added, {{len .Modified}} modified, {{len .Deleted}} deleted.",
    "labels": ["documentation"]
  },
  "version": { "files": ["package.json@.version"], "tag": "v{{.Version}}" }
}
```

1. `mode` is `mirror` or `overlay`. Mirror makes the source the sole owner of that subtree and removes files it no longer ships. Overlay only adds and updates.

2. `publish` is `auto` or `pr`. `auto` commits to `branch`, and on a push conflict opens a pull request. `pr` always opens one.

3. `commit.message`, `pullRequest.title`, `pullRequest.body`, and each label are Go templates with `.Repo`, `.Target`, `.Branch`, `.Version`, `.Added`, `.Modified`, `.Deleted`.

4. `version.files` are patch bumped in the path form `file@.json.path`. `version.tag` is the tag that triggers the deploy.

## Several locations from one repo

A repo that generates more than one kind of docs uses a `targets` array, each entry mapping a subfolder of `.nimpress` to a docs path.

```json
"targets": [
  { "from": "api", "to": "api/bookable" },
  { "from": "docs", "to": "solutions/bookable" }
]
```

The single `target` is the short form for one location. A repo can send its generated api to `api/bookable` and its prose to `solutions/bookable` in the same run.

## The GitHub App

A single organization GitHub App carries the cross repo trust, installed on the source repos and the docs repo with Contents read and write, Pull requests read and write, and Metadata read. Both workflows mint a token from it with `actions/create-github-app-token`. The pull request must use the App token, since an organization setting can forbid the default Actions token from opening pull requests, and the version tag must be pushed by the App token so the deploy fires.

## Secrets

The whole pipeline runs on that one App plus a packages token.

Source repo, any repo that publishes its own docs:

1. `APP_ID` is the App's numeric id.

2. `APP_PRIVATE_KEY` is the App's private key `.pem`. The consumer workflow mints a token from these and hands it to `docs-notify`.

Docs site repo:

1. `APP_ID` and `APP_PRIVATE_KEY`, the same App, so `docs-sync` can check out both repos, push, and open pull requests.

2. `PACKAGES_TOKEN` with `read:packages`, so the deploy can install `@nimling/nimpress` from GitHub Packages before `nimpress build`. The default Actions token cannot read a package owned by a sibling repo.

## Without the App, a dispatch token

The App is the primary path and the one that runs today. A source repo that will not install the App can dispatch with a token instead: set `NIMPRESS_DOCS_TOKEN` to a personal access token with repository dispatch access to the docs site and pass it to `docs-notify`. This swaps only the notify step; the docs receiver still authenticates with the App to check out, push, and open pull requests. A `nimpress.sources.json` source may carry an optional `secret` naming a docs repo checkout token, `NIMPRESS_SYNC_TOKEN` by convention, for a receiver wired to read it. `PACKAGES_TOKEN` is needed either way, since it is for the build rather than the sync.

## The deploy

The version tag that `docs-sync` pushes into the docs repo triggers that repo's deploy workflow, which runs `nimpress build` and publishes the site to GitHub Pages. Nothing else fires it, so the live site version tracks each sync.
