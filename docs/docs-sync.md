---
title: Publishing a repo's docs to the central site
description: How any nimling repo ships its own docs into the central docs site through the nimpress actions on a version tag.
---

A repo keeps its documentation next to its code in a `.nimpress` folder. On a version tag the nimpress pipeline mirrors that folder into the central docs site under a mapped path and opens a review pull request. Merging that pull request ships a new docs version. The same `docs-sync` and `docs-notify` actions serve every repo, so onboarding a new app is a small amount of config.

## How the flow runs

1. A repo pushes a version tag such as `v1.4.0`.

2. The consumer workflow checks whether `.nimpress` changed since the previous version tag. If nothing changed it stops.

3. It mints a token from the shared GitHub App and calls `docs-notify`, which sends a repository dispatch to the docs site with the source repo and the tagged commit.

4. The docs site receiver checks out the source repo at that commit, runs `docs-sync` to mirror `.nimpress` into the mapped subtree, then runs `nimpress lint` over the content.

5. If the source is listed in `autoPublish` the receiver commits to main and ships a new version. Otherwise it opens a review pull request on a `docs-sync/<owner>/<repo>` branch.

## The GitHub App

A single organization GitHub App carries the cross repo trust. It is installed on the source repos and the docs repo with Contents read and write, Pull requests read and write, and Metadata read. Each workflow mints a short lived token from it with `actions/create-github-app-token`.

1. The notify mints a token scoped to the docs repo to send the dispatch.

2. The receiver mints an organization token to check out the source repo and to open the pull request.

The pull request must be opened with the App token, not the default token, because an organization setting can forbid the default Actions token from creating pull requests. The App token is not subject to that restriction.

## Secrets

1. Each source repo and the docs repo carry `APP_ID` and `APP_PRIVATE_KEY`. The private key is the `.pem` generated in the App settings under Private keys.

2. The docs repo carries a `PACKAGES_TOKEN` for installing nimpress during the lint step.

## Onboarding a new app

1. Add a `.nimpress` folder at the repo root with the markdown for that app. It follows the same authoring rules as any nimpress content, including frontmatter and changelog entries.

2. Add the consumer workflow at `.github/workflows/docs.yml`. It triggers on a version tag, guards on `.nimpress` changes, mints the App token, and calls `nimling/nimpress/actions/docs-notify@v1`. The skill named docs-sync scaffolds this file.

3. Set `APP_ID` and `APP_PRIVATE_KEY` on the repo and install the App on it.

4. In the docs repo, add a mapping entry to `nimpress.sources.json` that points the source repo at a target subtree, with `mode` set to `mirror` or `overlay`. Add the source to `autoPublish` only when it may ship without review.

The first version tag after that runs the whole chain and produces the pull request.

## The mapping file

The docs site owns `nimpress.sources.json` at its repo root.

```json
{
  "sources": {
    "nimling/nimpress": { "target": "tools/nimpress", "mode": "mirror" }
  },
  "autoPublish": []
}
```

1. `target` is a path under the docs content root. `mirror` makes the source the single owner of that subtree and removes files it no longer ships. `overlay` only adds and updates.

2. `secret` is optional and names a docs repo secret to check out that source instead of the App token.

3. `autoPublish` lists sources that ship straight to main. Anything else lands as a review pull request.

## What not to do

1. Do not commit the synced subtree by hand. The pipeline owns `tools/<repo>` and similar targets.

2. Do not publish on every push. The trigger is a version tag, so the docs version tracks the app version.
