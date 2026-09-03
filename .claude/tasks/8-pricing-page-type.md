---
id: 8
parent: 1
relations: []
title: The pricing type renders tiers with a benefit list and one action each
type: Feature
status: staged
github:
assignee: Martin Ottersland
repos: [nimpress]
skills: [nimpress]
created_at: 2026-09-03T11:30:53Z
updated_at: 2026-09-03T11:30:53Z
questions: []
---

## Intent
The zensical Spark pricing page is a row of tiers, each with a title, a price line, a benefit list, and one action, with prose under the row. nimpress has no pricing surface. `type: pricing` renders tiers from frontmatter data.

## Scope
`src/types.ts` PageType. `src/plugin.ts` schema with `data.tiers` validated per tier. `src/markdown/PricingPage.svelte` new. `src/index.ts`. `docs/page-types/pricing.md`, `docs/examples/pricing.md`, the rule files, `docs/styling/page-types.md`, `docs/changelog/v2.4.0.md`. Reuse the action button classes from `Actions.svelte`, do not restyle buttons.

## Order
1. nimpress: add `pricing` to `PageType` and the schema union. `data.tiers` is required, an array of objects with `name` required, `price` as a string, `period` as a string, `description` as one sentence, `benefits` as an array of strings that may carry inline markdown, `action` as `{ text, link, variant }` with the same `variant` values `:::actions` takes, and `highlight` as a boolean marking the recommended tier. Lint fails a tier without a name.
2. nimpress: write `src/markdown/PricingPage.svelte`. It renders inside the doc shell without the rail unless `noToc` is false. The body renders first, then a `np-pricing-grid` of `np-pricing-tier` cards: name, price with the period beside it, description, a `np-pricing-benefits` list with a check glyph per item, the action button at the bottom. A highlighted tier carries `np-pricing-tier-highlight` and the brand border. `data.columns` pins the count; the default auto fits to the tier count up to four.
3. nimpress: `data.footnote` renders as a muted paragraph under the grid for the small print.
4. nimpress: dispatch and export.
5. nimpress: write `docs/examples/pricing.md` with three placeholder tiers and `docs/page-types/pricing.md` in the docs shape: definition paragraph, `## Frontmatter`, `## Tier fields` as a table, `## Restyling`. Add the type to the rule files and the decision tree, the classes to `docs/styling/page-types.md`, and the `## Pricing pages` changelog section.
6. verify: `just build && just check && node bin/nimpress.mjs lint`

## Done when
`node bin/nimpress.mjs lint` passes and `/examples/pricing` renders three tiers with the middle one highlighted.

## Summary
