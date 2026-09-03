# Authoring documentation

Rules for writing markdown pages, both inside this repo's `docs/` and inside consumer sites that use Nimpress.

## Voice

1. Short sentences. One idea per sentence.

2. Present tense. Active voice. Describe what is, not what will be.

3. No marketing language. No fluff.

4. Numbered lists at column zero in the form `1.`, `2.`, with a blank line between entries. Sub items use `1.1.`, `1.2.` at column zero. Never indent.

5. No bullets for ordered material. No a, b, c, no roman numerals.

6. No hyphens in text unless the word genuinely requires one, like `re-run` or `pre-commit`.

7. No em dashes, no en dashes, no parentheses. Restructure the sentence.

8. Never use the words `old`, `legacy`, `formerly`, `previously`, `used to be`, `replaces`, `renamed from`. Describe current state only.

## Headings

1. One H1 per page. The H1 is the rendered title, populated from frontmatter, so the markdown body starts at H2.

2. Use H2 to separate top level sections. H3 for sub sections. Avoid H4 unless absolutely necessary, the right rail TOC stops showing H4 in some themes.

3. Headings are sentence case. `## How it works`, not `## How It Works`.

## Links

1. Prefer relative links within the same section, absolute links across sections. See [Relative links](https://nimling.github.io/nimpress/authoring/relative-links).

2. Use the page title as the link text. Avoid `click here`.

## Code

1. Fence every code block with its language. `bash`, `ts`, `python`, `json`, `yaml`, `http`. Aliases: `curl` and `sh` render as bash, `hurl` renders as http.

2. Use `:::code-group` when showing the same example in two or more languages.

2.1. A ` ```dbml ` fence renders as an interactive diagram, not as code. Use it for database schemas and use `sql` for statements.

3. Keep code blocks short. Long examples belong in a runnable repo, linked from the docs.

## Tables

1. Tables for reference grids of fields, options, or commands.

2. First column is the identifier, last column is the description.

3. No nested markdown inside cells beyond inline code spans.

## Callouts

1. `:::tip` for opt in advice that improves outcomes.

2. `:::note` for context the reader benefits from but can skip.

3. `:::warning` for things that will go wrong if ignored.

4. `:::info` for neutral background.

5. `:::check` for verification steps.

6. `:::abstract` for a summary of the section that follows.

7. `:::success` for the outcome the reader sees when a step worked.

8. `:::question` for a question the reader is likely to ask, answered in the body.

9. `:::failure` for the outcome the reader sees when a step did not work.

10. `:::danger` for actions that lose data or cannot be undone.

11. `:::bug` for a known defect and its workaround.

12. `:::example` for a worked example set apart from the prose.

13. `:::quote` for a quotation with its source.

Text after the type name is the title, `""` removes the title row, and a JSON payload on the opening line takes `collapsible`, `open`, and `inline`. See [Markdown](https://nimling.github.io/nimpress/authoring/markdown).

Use sparingly. Three callouts on a page is already a lot.

## Definition lists

Use for reference grids of terms with one line descriptions:

```md
term_name
: One line description.
```

See [Definition lists](https://nimling.github.io/nimpress/authoring/definition-lists).

## When to write what

1. Concept guide: one focused topic, 100 to 400 words, with examples. Lives under `docs/`.

2. Tutorial: a sequence of steps the reader follows in order. Numbered list at column zero, one section per phase.

3. Reference: dense table of fields, options, or APIs. Tables and definition lists carry most of the content.

4. Changelog entry: one markdown file per release, `type: changelog`, `data.version` set. See [Changelog renderer](https://nimling.github.io/nimpress/page-types/changelog).

5. Landing page: `type: hero` with a tagline and feature grid. See [Hero](https://nimling.github.io/nimpress/page-types/hero).

## Page skeleton

Every feature page in `docs/` follows one shape, the shape the setup and authoring pages of zensical.org use.

1. A definition paragraph opens the page: what the thing is, why it matters in documentation, and what nimpress provides. A definition sentence quoted from a reference keeps its adjectives and dashes; the voice rules above do not rewrite a quotation.

2. `## Configuration` follows when a switch exists, with one H3 per option. A configuration paragraph ends with "Add the following lines to your configuration:" and a fenced json block of the config field.

3. `## Usage` follows with one H3 per verb, `### Add a button`, `### Hide the sidebars`, `### Use card grids`. A usage paragraph that depends on a switch opens with "When X is enabled".

4. `## Customization` follows when an override exists, with one H3 per override. Pages that render chrome end with `## Restyling` pointing at the styling reference.

5. Names stay nimpress names when the sentences are borrowed: callouts, actions, cards, features, frontmatter. Nothing is called an admonition.

## The tree

`docs/` has one folder per top level section: `get-started`, `usage`, `setup`, `authoring`, `page-types`, `examples`, `styling`, `community`, plus `changelog`, `tags`, `glossary`, and `404` at the root. A page that lives at the root keeps its url and joins its section with a `sidebar` block whose `path` names the section folder.
