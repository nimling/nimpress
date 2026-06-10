# Choosing a page type

Quick guide for picking the right `type` in frontmatter.

## `doc`

The default. Reach for it first. Anything that does not match the other three is a `doc`.

## `openapi`

Use only when:

1. The page exists to document an HTTP API.

2. There is a maintained OpenAPI 3.1 spec next to the markdown file.

3. The reader expects per operation deep links such as `#operation/PostBookable`.

Do not duplicate the spec by writing prose for each endpoint. Edit the spec descriptions, the renderer pulls them in and runs them through the same markdown pipeline.

## `changelog`

Use when:

1. The page collects release notes that grow over time.

2. Each release should be authored as one markdown file, so reviewing a release is a single file PR.

3. Multiple files should share one URL and one rendered scroll.

Do not use `changelog` for migration guides or one off retrospectives. Those are `doc` pages.

## `hero`

Use sparingly for:

1. The site home page.

2. Top level section landing pages: `/solutions`, `/tools`, `/libraries`, `/api`.

3. New product or service introductions.

Do not use `hero` for ordinary documentation. The oversized typography is a beacon, not a default.

## `roadmap`

Use when:

1. The page surfaces planned and shipped work as a customer facing timeline.

2. The markdown file describes only the page header and background. Sibling files of `type: milestone | epic | feature | bug` carry the actual items.

3. Changelog entries can opt in with `data.issue: <relative path>` and `data.status` so shipped work updates the rocket and drops a marker on the spine.

Do not use `roadmap` for internal status notes or engineering tickets. The page is customer facing. See [roadmap-entries.md](./roadmap-entries.md).

## `milestone | epic | feature | bug`

Issue page types. Each file is one standalone page at its own URL, listed under a parent `type: roadmap` page in the sidebar.

1. Use when describing a roadmap item that customers should be able to deep link to.

2. Frontmatter: `title`, `description`, `data.date` are required. `data.parent` references another issue in the same roadmap.

3. The body is a regular doc page that renders with a kind chip and date header above the markdown.

## Decision tree

```
Is the page rendered from an OpenAPI spec?
├─ Yes  → type: openapi
└─ No
   ├─ Is it a stack of versioned release notes?
   │  └─ Yes  → type: changelog
   ├─ Is it a customer facing roadmap header?
   │  └─ Yes  → type: roadmap
   ├─ Is it one item on a roadmap timeline?
   │  └─ Yes  → type: milestone | epic | feature | bug
   ├─ Is it a beacon style landing page?
   │  └─ Yes  → type: hero
   └─ Otherwise → type: doc  (omit the field)
```
