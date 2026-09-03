---
title: Publish your site
order: 4
tags: Setup, Publishing
description: Deploy the built site automatically on every push to GitHub Pages, GitLab Pages, or any static host.
---

The great thing about hosting project documentation in a git repository is the ability to deploy it automatically when new changes are pushed. nimpress makes this ridiculously simple: the build is a folder of static files, and any host that serves a folder serves the site.

## GitHub Pages

If you're already hosting your code on GitHub, GitHub Pages is certainly the most convenient way to publish your project documentation. It's free of charge and pretty easy to set up.

### with GitHub Actions

Using GitHub Actions you can automate the deployment of your project documentation on pushes to a specific branch in your repository. At the root of your repository, create a new GitHub Actions workflow, `.github/workflows/docs.yml`, and copy the following contents:

```yaml
name: Publish the docs site
on:
  push:
    branches:
      - main
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec nimpress lint
      - run: pnpm exec nimpress build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - id: deploy
        uses: actions/deploy-pages@v4
```

Now, when a new commit is pushed to `main`, the static site is automatically built and deployed. Push your changes to see the workflow in action. In the repository settings, set the Pages source to GitHub Actions.

A project page lives under a subfolder of the user or organization domain, `https://nimling.github.io/nimpress/`. Set the `base` field in the config to that subfolder so every asset and route resolves:

```json
{
  "base": "/nimpress/"
}
```

The build also writes `404.html` at the output root, so an address that has no page behind it still boots the site, and a [not found page](/page-types/404) renders in place when the site has one.

## GitLab Pages

If you're hosting your code on GitLab, deploying to GitLab Pages can be done by using the GitLab CI task runner. At the root of your repository, create a task definition named `.gitlab-ci.yml` and copy the following contents:

```yaml
pages:
  image: node:22
  before_script:
    - corepack enable
    - pnpm install --frozen-lockfile
  script:
    - pnpm exec nimpress lint
    - pnpm exec nimpress build
    - mv dist public
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

Now, when a new commit is pushed to `main`, the static site is automatically built and deployed.

## Other

We cannot document every hosting provider here. The build writes a folder of static files, `dist` by default, with an `index.html` per route and a `404.html` at the root. Copy that folder to any static host, set `base` when the site lives under a subfolder, and the site runs.

A repo that keeps its docs beside its code and publishes them into a central site on a version tag uses the nimpress actions instead; see [Publishing a repo's docs to the central site](/actions).
