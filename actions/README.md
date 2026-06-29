# nimpress docs actions

Two GitHub Actions that move a repo's docs into the central docs site and gate the publish.

## docs-notify

Runs in a source repo. On a change under `.nimpress` it sends a repository dispatch to the docs site repo with the source repo name and commit sha. Copy `consumer-workflow.example.yml` into the source repo at `.github/workflows/docs.yml` and set the `NIMPRESS_DOCS_TOKEN` secret to a token with dispatch access to the docs site.

Inputs:

1. `docs-repo` is the full name of the docs site repo.

2. `token` is the dispatch token.

3. `event-type` defaults to `nimpress-docs-sync`.

## docs-sync

Runs in the docs site repo, driven by `repository_dispatch`. It checks out the source repo at the dispatched sha, mirrors `.nimpress` into the mapped subtree under the docs content root, and reports the change set. The receiver workflow then lints the frontmatter and publishes.

Inputs are absolute paths: `source-path`, `mapping`, `content-root`, and `source-repo`. Outputs are `changed`, `auto`, and `target`.

## Mapping

The docs site owns `docs/.nimpress-sources.json`:

```json
{
  "sources": {
    "nimling/samna-bookable-server": { "target": "solutions/bookable", "mode": "mirror" }
  },
  "autoPublish": ["nimling/samna-bookable-server"]
}
```

1. `target` is a path under the docs content root. `mode` is `mirror` or `overlay`. Mirror makes the source the single owner of that subtree and removes files it no longer ships. Overlay only adds and updates.

2. `autoPublish` lists sources allowed to ship without a pull request. A source not listed lands as a pull request for review.

## Layout

```
actions/
  go.mod
  docs-notify/   action.yml + main.go
  docs-sync/     action.yml + main.go
  internal/docssync/   shared mapping, mirror, and diff
```
