# Definition lists

Compact term and description pairs. Useful for glossaries, metric reference pages, and field listings where a fenced code block would feel too heavy. Supported via `markdown-it-deflist`, the PHP Markdown Extra extension.

## Syntax

```md
bookables_by_usage
: Resources ranked by booking count and total booked hours.

bookable_utilization_rate
: Average utilization percentage per resource over the selected period.
```

Each term is a single line. Each description starts with `:` and a space. A description may span multiple paragraphs as long as continuation lines are indented.

## Rendered

The renderer applies a coral left border, monospace term, and a muted indented description. The exact styling lives in `src/styles/preflight.css` under the `.np-prose dl` selectors and can be overridden by your own CSS using the same selectors.

## When to use

1. Listing fields, metrics, properties, or terms where each item has a short description.

2. Replacing repetitive heading and paragraph pairs that just hold a label and one sentence.

3. As a lighter alternative to a fenced code block when the content is descriptive prose, not code.
