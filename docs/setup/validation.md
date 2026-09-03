---
title: Validation
order: 11
tags: Setup, lint
description: The checks lint runs over every page before the build, and how to read a failure.
---

Broken links are easy to miss, pages get renamed or moved, and references silently stop working. nimpress validates the structure, the frontmatter, and every import under the content tree at lint time, then builds the whole site to a throwaway folder to prove the output compiles.

## Configuration

Validation is on without configuration and runs with `nimpress lint`. The `vite.resolve.alias` block of the config is the one setting the import check reads, so an alias import resolves the way the build resolves it.

## Checks

### Structure

Folder and file naming, one component page per folder, one not found, tags, and glossary page per site, a section page on a folder index only, changelog entries without `path`, stories and schemas only beside a component page, and page css only beside its page.

### Frontmatter

Every markdown file parses, its frontmatter validates against the schema, and every field a page type requires is present.

### Imports

Every code file under the content tree has its static and dynamic imports checked: relative imports must resolve on disk, alias imports resolve through the config, and an import of a `_shared` folder fails outright.

### Modules

The full `modules lint` pass over every component system.

### Build

When the content passes, lint builds the whole site and reports compile errors prefixed with `build:`. `--no-build` skips this stage.

## Usage

Just write your content as usual, and run lint before every build:

```bash
nimpress lint
```

A failure prints `nimpress lint failed with <n> problems` and then one line per problem, each naming the file relative to the content folder and what to change. Fix the file the line names. See [lint](/usage/lint).
