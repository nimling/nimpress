---
title: Pull requests
order: 5
tags: Community
description: How to prepare a change that is easy to review and lands with its docs and its spec.
---

Learn how to create a pull request that is easy for maintainers to review. A change to nimpress lands with three things in one commit: the code, its docs page, and its browser spec, and every gate passes before it is pushed.

## Prepare

1. Fork the repository and clone it. Install with `just install`, which runs `pnpm install`; nimpress uses pnpm only.

2. Build the library once with `just build`; the docs dev server and every test read the built library.

3. Run `just dev` to serve this repository's own docs against the built library, rebuilding on every source change.

## Make the change

1. Match the surrounding code: Svelte 5 runes, no comments, edits in place, no parallel files, and a rename applied everywhere in the same change.

2. Every visual choice goes through a token in `src/styles/tokens.css` with a light and a dark value, and every element on rendered chrome carries a stable `np-` class documented under [Styling](/styling).

3. A heavy browser renderer loads through a dynamic import inside the component that owns it.

4. Write the docs page for the change in the shape the [authoring](/authoring) pages use, and the changelog section for the release under `docs/changelog/`.

5. Write a browser spec under `e2e/` that opens the page and asserts the rendered result.

## Verify

Run the gate before you push. It builds the library, type checks, lints the docs, builds the site, and runs the browser specs, the Go tests, and the unit tests:

```bash
just build
just check
node bin/nimpress.mjs lint
just test
```

A red gate is fixed in the change, never by loosening the check.

## Commit and open the pull request

1. One commit per change, with a one sentence message describing the user visible change.

2. The pull request description says what the reader sees, links the docs page it adds or changes, and names the spec that proves it.

3. A release is a version tag pushed by the maintainers; a pull request never bumps the version.
