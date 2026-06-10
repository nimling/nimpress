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
  title: Booking calendars, code actions, full user management
  description: One sentence summary shown under the version header.
---
```

1. Top level `title` is the page title and the grouping key. Every entry file in the same folder uses the exact same string.

2. `type: changelog` is required for the plugin to group the file.

3. `data.version` is required. Newest version sorts first. Parsed as dot delimited numeric segments. Optional leading `v` is allowed.

4. `data.release_date` is required. An RFC 3339 timestamp. Date only (`2026-06-08`) is accepted and interpreted as midnight UTC. Full timestamps (`2026-06-08T09:00:00Z`) are accepted. The renderer formats it as `DD.MM.YYYY` next to the entry title. Invalid values fail the build.

5. `data.title` is the per release headline shown next to the version pill in the entry header.

6. `data.description` is one short sentence shown under the header when the entry is expanded. Plain text only, markdown is not rendered. Inline code spans, links, bold, and lists in this field show as raw markdown source. Write the sentence in prose, naming identifiers without backticks.

## Linking to a roadmap item

`data.roadmap` on a changelog entry declares an explicit link to a roadmap item by relative path. The plugin resolves the path against the changelog file. The matched roadmap item flips to `shipped` from the earliest linked release date and lists the linked changelog versions on the hover aside.

```yaml
data:
  version: 1.5.0
  release_date: 2026-06-10
  title: Organization settings
  description: Plain text sentence.
  roadmap: ../roadmap/org-settings.md
```

Use the path with or without the trailing `.md`. Use it once per changelog entry. One changelog entry can land work for one roadmap item. Split shipped scope across separate entries when one release closes several roadmap items.

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

1. Never write an H1 or H2 in the body. The entry header carries the title row, and any higher heading collides with the page chrome. Start the body at H3. H3 is the maximum heading size.

2. Lead with one short paragraph or a single H3 summary section. The reader should know whether they care without expanding the entry.

3. Group user visible changes under H3 headings: themes, not severity. One section per shipped capability.

4. Inside each section, use a bulleted or short prose list. One change per item, one sentence per item.

5. Link to the relevant PR or issue when the change references work outside the docs.

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
