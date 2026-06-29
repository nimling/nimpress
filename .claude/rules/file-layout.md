# File layout

Conventions for organizing markdown content inside a Nimpress site.

## Directory mirrors URL

By default, the directory layout under `contentDir` is the URL layout. `docs/guide/intro.md` lives at `/guide/intro`. `docs/guide/index.md` lives at `/guide`. `docs/index.md` lives at `/`.

Override with frontmatter `path` when the URL and the file location should differ.

## Index files

A directory that should have its own landing page contains an `index.md`. That file becomes the directory's route and the directory's sidebar group label.

A directory without an `index.md` shows as a synthetic group in the sidebar. The group label is a Title Case version of the directory name. The group has no link of its own, only its children.

## Naming

1. Files use lowercase kebab case. `getting-started.md`, not `Getting_Started.md`.

2. Directories use lowercase. `guide/`, not `Guide/`.

3. No spaces in file or directory names ever.

4. Avoid abbreviations unless the abbreviation is the canonical name in the domain.

## Grouping

1. One top level directory per top level section. Keep the count small, the sidebar gets crowded fast.

2. Co locate related pages. Tutorials for the OpenAPI renderer live near `docs/openapi.md`, not in a separate `tutorials/` tree.

3. Resist creating a directory for a single page. Promote that page up a level instead.

## Reorganizing

1. Renaming a file changes its URL. If the page might be linked externally, set frontmatter `path` to the old URL so the link still works.

2. Moving a file across directories is the same rule.

3. Deleting a file is a hard break. Decide whether to delete or to redirect via frontmatter `redirect`.

## Assets

1. Shared assets live in the `assetsDir` folder, `assets` by default, at the repo root. Reference them by an absolute path under `assetUrlBase`, `/assets` by default. `![Diagram](/assets/architecture.svg)`. Downloadable files such as a pdf live here too and are served at the same base. The whole `assetsDir` folder is copied into the build output.

2. Images that belong to one page live next to that page's markdown file inside `contentDir`. Reference them with a path relative to the markdown file. `![Diagram](./architecture.svg)`. nimpress serves them in dev and emits every non markdown file under `contentDir` into the build output.

3. `assetsDir`, `assetUrlBase`, and `contentDir` are set in `nimpress.config`. A consumer that keeps a single public folder points `assetsDir` at it and sets `assetUrlBase` to `/`.
