---
title: GitHub Actions
description: Publish a repo's docs into the central site through the nimpress actions on a version tag.
order: 2
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
