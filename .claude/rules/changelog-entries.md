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

5. `data.title` is the per release name. Hard limits:

5.1. **Max 48 characters.** Builds fail above the limit.

5.2. **No commas.** A comma means the title is trying to list more than one shipped thing — split it into two releases or move the rest to the body.

5.3. **No code identifiers.** No backticks, no method names, no path segments, no query parameters, no field names, no SQL identifiers, no Go symbols, no `:`-prefixed param placeholders. If the only way to name the release is with an identifier, the title is wrong — pick the user-visible capability instead.

5.4. **Sentence case, one phrase.** Examples to write: `Booking calendars`, `Organization settings`, `Conflict clarity`. Examples to reject: `Setting joins claimius, with-set hydration on the audit and relation endpoints, and an actor naming sweep`, `` `with=access` everywhere ``, `POST /api/calendar shipped`.

6. `data.description` is one short sentence that frames the release for a reader scanning the changelog. Hard limits:

6.1. **Max 160 characters.** Builds fail above the limit.

6.2. **One sentence.** Period only at the end.

6.3. **No code identifiers.** No backticks, no method names, no paths, no query parameters, no function names, no struct names, no SQL identifiers. The description is the introduction, not the implementation summary.

6.4. **No detail enumeration.** Skip `routes through`, `hydrates`, `is renamed to`, multi-clause `and …, and …` constructions. Frame the why or the user-facing effect.

6.5. Plain text only, markdown is not rendered.

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

3. Heading text is a short friendly readable label. Never an identifier, method, path, query parameter, or backticked token. Examples to write: `Creator hydration`, `Booking calendars`, `Conflict clarity`. Examples to avoid: `` `with=creator` on every endpoint ``, `POST /api/calendar`, `inherit on POST endpoints removed`.

4. Under each heading, write one prose paragraph that frames the change in human terms. Move every identifier, route, query parameter, status code, schema name, and token into that prose (or the code blocks beneath it), inside backticks. Identifiers belong in the body, not in the heading.

5. Inside each section, use a bulleted or short prose list. One change per item, one sentence per item, with identifiers wrapped in backticks.

6. Use fenced code blocks for HTTP exchanges, YAML, JSON, and request or response bodies. Inline `code` spans carry the identifiers inside prose.

7. Link to the relevant PR or issue when the change references work outside the docs.

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

5. Repository file paths, directory layouts, code-base file names, or any reference to where code lives in the source tree. The changelog is read by API consumers, not by repo contributors. Anything that names `internal/`, `cmd/`, `openapi_definition/`, `<op_id>_*.yml`, or a path under the repo is a rule violation. The API path (`/api/...`) is fine; the file path is not.

6. Wording that names the same fact from two angles ("absent from the running surface and absent from the spec", "removed from the code and the spec", "dropped from both X and Y"). State the user-facing fact once. The reader does not see the spec and the running handlers as two separate things — only the API.

7. Restating what the version number already conveys. A line that says "this release ships v1.5.1" carries no information.

## How to phrase removals

A removal lands in one of three buckets. Pick the bucket; the wording follows.

1. Breaking removal of a public capability — keep the heading short, name the capability, write a short paragraph that names what the consumer must change to keep working, and bold the word `breaking`.

2. Gated capability that is held back from public exposure — say it is held back and why ("held back until end-to-end testing finishes"), do not say "removed". A held-back capability is coming back; calling it removed is misleading.

3. Capability the consumer never saw (debug, internal, deprecated-from-day-one) — do not write a line at all. It does not belong in the changelog.

## How to phrase examples and error responses

The reader cares that the docs Try-It and the response panels show meaningful bodies, not that some example file lives at a repo path.

1. Write what the reader sees in the docs: "Every endpoint shows a real captured response body for `200`, `400` and `403` in the docs panel" — not "examples live under `openapi_definition/examples/...`".

2. Status codes belong inside backticks. Repo paths to example files do not appear at all.

3. If the change is the addition of error response bodies on the docs site, that is one line. Not three list items naming the file layout.

## Rendered shape

1. Page H1 reads from the top level `title` of the highest version entry, so every entry file uses the same string.

2. Each entry is a row of `[version pill] [data.title] [chevron]`. Clicking the row expands the body.

3. The first entry expands by default. A direct hash like `/path#v1.4.2` expands that entry and scrolls to it.

4. The right rail TOC lists every version as a level 2 heading. The left sidebar adds one child entry per version under the collection page, each pointing at the hash anchor.
