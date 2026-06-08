# Search

Local, client side, no external service. Powered by MiniSearch.

## Trigger

`Cmd+K` or `Ctrl+K` opens the search modal. `Esc` closes it.

## Index content

The plugin emits a search corpus to `virtual:nimpress/search`. Each entry has:

1. `slug` and `path` for navigation.

2. `title` and `description` from frontmatter.

3. `body` derived from the markdown source with fenced code blocks stripped.

4. `headings` collected by the anchor walker.

5. `scope` and `claim` so the runtime can hide gated hits from viewers who lack access.

Hidden pages are excluded from the corpus at build time.

## Scoring

MiniSearch defaults with prefix matching enabled. Title and headings carry higher weight than body. Hits show a small breadcrumb so the viewer can recognize the section.

## Custom index

`buildIndex` is exported from `@nimling/nimpress`. Replace the runtime call to plug a different ranking, a different store, or a remote search backend. The modal accepts a search function so swapping the store is a one liner.

## Limitations

1. Search runs in the browser. Large sites benefit from sharding the corpus or replacing the index with a remote service.

2. The corpus is rebuilt every time markdown changes, so HMR keeps it fresh during local development.

3. Stop word lists and stemmers are MiniSearch defaults. Customize through the `buildIndex` options if your domain needs it.
