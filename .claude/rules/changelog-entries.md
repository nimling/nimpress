# Authoring changelog entries

Rules for writing release notes when the site uses `type: changelog`.

## One file per release

Every release is its own markdown file. Reviewing a release is a single file PR. Combining releases in one file is a rule violation.

## Required frontmatter

```yaml
---
title: 1.2.0 cookie refresh
type: changelog
path: /docs/changelog
data:
  version: 1.2.0
---
```

1. `title` is the entry header. Lead with the version and a short tagline. The tagline is the headline of what changed.

2. `type: changelog` is required for the plugin to group the file.

3. `path` is the same across every changelog file. The plugin throws a build error if two non changelog pages share a path.

4. `data.version` is required for sort order. Use semver style. Optional leading `v` is allowed.

## Version sort

Newest first. Parsed as dot delimited numeric segments. `1.10.0` ranks above `1.2.9`. Pre release suffixes are not parsed, they sort last among same base versions.

## Entry body

1. Lead with one paragraph summarizing the release. The reader should know whether they care without expanding the entry.

2. Group changes under H3 headings: `### Added`, `### Changed`, `### Fixed`, `### Removed`, `### Security`. Skip empty groups.

3. Inside each group, use a numbered list. One change per item, one sentence per item.

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

## Layout in the file tree

Place every changelog file inside one directory:

```
docs/
└── changelog/
    ├── 1-0-0.md
    ├── 1-1-0.md
    └── 1-2-0.md
```

File names are arbitrary, the plugin reads `data.version`, not the filename. Use the version as the filename for readability.
