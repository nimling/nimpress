# Frontmatter

YAML at the top of every markdown file, parsed with `gray-matter` and validated with `zod`. Unknown fields warn but do not fail the build.

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string, required | Page heading rendered as h1 |
| `slug` | string | Short label rendered in the sidebar, falls back to `title` |
| `type` | `doc` \| `openapi` \| `changelog` \| `hero` | Renderer selection, defaults to `doc` |
| `path` | string | Route override, default derived from the file location |
| `spec` | string | Required when `type: openapi`, path to the spec JSON, relative to the markdown file |
| `scope` | string | Auth scope required to view the page |
| `claim` | string | Auth claim required to view the page |
| `description` | string | Meta description and search excerpt |
| `order` | number | Sort position inside the parent sidebar group |
| `icon` | string | Optional icon next to the sidebar entry |
| `hidden` | boolean | Excludes the page from sidebar, search, and direct routing |
| `collapsed` | boolean | Starts the sidebar group collapsed |
| `lastUpdated` | boolean | Show the last updated stamp in the page footer area |
| `redirect` | string | Send the visitor to another path on load |
| `noToc` | boolean | Hide the right rail table of contents |
| `footer` | string | Centered, muted text rendered at the bottom of the page |
| `data` | object | Renderer specific payload, see below |

## `data`

Arbitrary object handed to the renderer the page selected.

`type: changelog` reads `data.version`.

`type: hero` reads `data.tagline`, `data.lead`, `data.image`, `data.actions`, `data.features`.

A custom renderer reads whatever it needs.

## Path derivation

Default `path` for `docs/guide/intro.md` is `/guide/intro`. For `docs/guide/index.md` it is `/guide`. For `docs/index.md` it is `/`.

A frontmatter `path` overrides this entirely.

## Duplicate paths

Two pages sharing the same effective `path` raise a build error. The exception is two `changelog` pages, which collapse into one rendered page. See [changelog.md](./changelog.md).
