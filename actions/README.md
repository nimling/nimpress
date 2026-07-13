# nimpress docs actions

Three GitHub Actions that publish a repo's `.nimpress` docs into the central docs site. `docs-notify` fires from a source repo on a version tag and dispatches the docs repo, from a `.nimpress` folder or from pages marked with the `export:` frontmatter header. `docs-export` collects the marked pages into the tree docs-sync consumes. `docs-sync` runs in the docs repo, mirrors the folder into the mapped subtree, then commits and tags or opens a pull request.

The full guide lives in the docs at [../docs/actions.md](../docs/actions.md): the flow, the action inputs and outputs, the mapping in `nimpress.sources.json`, the GitHub App, the secrets each repo needs, the deploy, and the token only alternative.

## Layout

```
actions/
  go.mod
  docs-notify/   action.yml + main.go
  docs-export/   action.yml + main.go
  docs-sync/     action.yml + main.go
  internal/docssync/   shared mapping, mirror, and diff
```
