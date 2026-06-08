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

1. Static assets live in the consumer's `public/` directory and are referenced by absolute path. `![Diagram](/img/architecture.svg)`.

2. Do not import assets from inside markdown. Markdown is content, not code.
