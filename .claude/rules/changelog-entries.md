# Authoring changelog entries

Rules for writing release notes when the site uses `type: changelog`.

## One file per release

Every release is its own markdown file. Reviewing a release is a single file PR. Combining releases in one file is a rule violation.

## How files collapse into one page

Every entry file declares `title: Changelog` (or whatever the collection's display name is) and `type: changelog`. Files sit in one folder. The plugin groups by `(parent folder, title)` and produces one collection page mounted at that folder's path. Each file is one entry on the page.

The filename is arbitrary. Use the version (`v1.4.2.md`) so the file tree reads as a release log.

## Required frontmatter

```yaml
---
title: Changelog
type: changelog
data:
  version: 1.4.2
  release_date: 2026-06-08
  title: Booking calendars
  description: Booking calendars become a first class resource.
---
```

1. Top level `title` is the page title and the grouping key. Every entry file in the same folder uses the exact same string.

2. `type: changelog` is required for the plugin to group the file.

3. `data.version` is required. Newest version sorts first. Parsed as dot delimited numeric segments. Optional leading `v` is allowed.

4. `data.release_date` is required. An RFC 3339 timestamp. Date only (`2026-06-08`) is accepted and interpreted as midnight UTC. Full timestamps (`2026-06-08T09:00:00Z`) are accepted. The renderer formats it as `DD.MM.YYYY` next to the entry title. Invalid values fail the build.

5. `data.title` is the per release name. Keep it to a short, friendly one phrase label. No comma lists, no laundry list of changes. Example: `Booking calendars`, `Organization settings`, `Conflict clarity`. The full rundown goes in the markdown body.

6. `data.description` is the brief outline shown under the header when the entry is expanded. One short sentence that frames the release for a reader scanning the changelog. Plain text only, markdown is not rendered. Skip identifier lists, skip backticks, save details for the body.

## Linking to a roadmap issue

`data.issue` on a changelog entry declares an explicit link to a roadmap issue file by relative path. The plugin resolves the path against the changelog file. `data.status` reports the effect of this release on the issue: a number `0..100` for partial progress, or the literal word `completes` (also `completed`, `complete`, `closes`, `fixes`, `resolves`) to flip the issue to `shipped`.

```yaml
data:
  version: 1.5.0
  release_date: 2026-06-10
  title: Organization settings
  description: Plain text sentence.
  issue: ../roadmap/organization-settings
  status: completes
```

1. Use the issue path with or without the trailing `.md`.

2. `data.status` as a number sets the rocket position; the highest number across all linked releases for the same issue wins.

3. `data.status: completes` flips the issue to `shipped` and parks the rocket at this point.

4. The release drops a marker on the roadmap spine at the changelog's `release_date`. Clicking the marker navigates back to the changelog entry.

## Never set these on a changelog entry

1. `path` is rejected. The route is derived from the entry folder.

2. Top level `description` is ignored. Put it under `data` instead.

## Layout in the file tree

Place every changelog file inside one directory:

```
docs/
└── solutions/
    └── bookable/
        └── changelog/
            ├── v1.4.0.md
            ├── v1.4.1.md
            └── v1.4.2.md
```

The collection page lives at `/solutions/bookable/changelog`. Each file shares `title: Changelog` so they merge.

## Version sort

Newest first. Parsed as dot delimited numeric segments. `1.10.0` ranks above `1.2.9`. Pre release suffixes are not parsed, they sort last among same base versions.

## Entry body

The body carries the real detail of the release. The renderer applies its own scaled down styling for headings inside an entry, so H1 through H6 are all allowed and read as compact section markers, not page chrome.

1. Lead with one short paragraph that names the shipped capability.

2. Group user visible changes under headings: themes, not severity. One section per shipped capability. Use the heading level that reflects nesting depth.

3. Inside each section, use a bulleted or short prose list. One change per item, one sentence per item.

4. Link to the relevant PR or issue when the change references work outside the docs.

## What to include

1. User visible behavior changes.

2. Breaking changes, called out explicitly. Bold the word `breaking` so the reader cannot miss it.

3. New configuration fields, with the value to set.

4. Removed features, with the migration path.

## What not to include

1. Internal refactors with no user visible effect.

2. Dependency bumps that do not change behavior.

3. Documentation only changes.

4. Anything already obvious from the version number.

## Rendered shape

1. Page H1 reads from the top level `title` of the highest version entry, so every entry file uses the same string.

2. Each entry is a row of `[version pill] [data.title] [chevron]`. Clicking the row expands the body.

3. The first entry expands by default. A direct hash like `/path#v1.4.2` expands that entry and scrolls to it.

4. The right rail TOC lists every version as a level 2 heading. The left sidebar adds one child entry per version under the collection page, each pointing at the hash anchor.
