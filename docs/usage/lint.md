---
title: lint
order: 4
tags: cli, lint
description: Validate the structure, the frontmatter, the imports, and the modules, then build to prove the output compiles.
---

`nimpress lint` is the check to run after touching content. Broken links are easy to miss, pages get renamed or moved, and references silently stop working; lint catches what the build would otherwise carry to the host.

## Usage

```bash
nimpress lint
nimpress lint --no-build
```

Four passes run over the content folder and report together, one line per problem naming the file and what to change, then a verification build runs into `<cache>/lint` and is removed afterwards. The exit code is 1 when anything fails.

1. Structure: folder and file naming, one `type: component` page per folder, one `404`, `tags`, and `glossary` page per site, a `section` page on a folder index only, changelog entries without `path`, stories and schemas only beside a component page, page css only beside its page.

2. Frontmatter: every markdown file parses and its frontmatter validates against the schema, including the fields a page type requires.

3. Imports: every `.ts`, `.tsx`, `.js`, `.mjs`, `.vue`, and `.svelte` file under the content tree has its static and dynamic imports checked. Relative imports must resolve on disk, alias imports resolve through the `vite.resolve.alias` block, and an import of a `_shared` folder fails outright.

4. Modules: the full `modules lint` pass over every system.

5. Build: when the content passes, lint builds the whole site to a throwaway folder and reports compile errors in the same format, prefixed with `build:`.

## Options

| Option | Description |
|---|---|
| `--no-build` | Stop after the four checks and skip the verification build. |
