---
title: Styling
order: 60
description: Every class nimpress renders is a documented override point, because everything it ships sits in a cascade layer.
---

Nimpress renders 529 classes across the shell, the prose, the page types, the renderers, and search. Every one of them is a public override point.

## Why your rule wins

Everything nimpress ships is wrapped in a cascade layer:

```css
@layer nimpress {
  :root { --np-brand: #A85A3F; }
  .np-header.svelte-e8nyzm { border-bottom: 1px solid var(--np-border); }
}
```

A rule you write is not in that layer, and an unlayered rule beats a layered one no matter what the specificity is. So this works:

```css
.np-header {
  border-bottom: 2px solid var(--np-brand);
}
```

No `!important`, no repeating the internal class, no matching a build hash. Properties you do not name keep the value nimpress gave them, so an override is a patch rather than a replacement.

## Three routes, in order of reach

1. **Tokens.** Change a custom property and every component that reads it follows. Reach for this first. The catalog is in [Theming](/theming).

2. **Classes.** Target a class from the tables in this section when a token cannot express the change. Site wide, from the stylesheet named in the `css` config field.

3. **Page styles.** A stylesheet named after a markdown file loads only while that page and its subpages are open. `guide/index.css` beside `guide/index.md` applies across `/guide`, a leaf page's stylesheet applies to itself alone.

```ts
export default defineConfig({
  css: 'app.css'
})
```

## The naming convention

1. Every component root carries a stable `np-<scope>` class.

2. Internal elements carry `np-<scope>-<part>`.

3. State is a modifier on the same element: `np-op-collapsed`, `np-hero-has-banner`, `np-tool-active`.

4. The class set on rendered chrome is a public contract. Names are only renamed across a major version.

## The areas

| Area | Classes | Covers |
|---|---|---|
| [Shell](/styling/shell) | 64 | Header, sidebar, breadcrumbs, right rail, back to top |
| [Prose and markdown](/styling/prose) | 53 | Content column, code blocks, callouts, cards, actions, features |
| [Page types](/styling/page-types) | 195 | Hero, changelog, roadmap, database pages, component workshop |
| [Renderers](/styling/renderers) | 199 | OpenAPI reference, DBML diagram, inline component frame |
| [Search](/styling/search) | 18 | Trigger, modal, result rows |

## What not to do

1. Do not reach for `!important`. The layer already puts you ahead, so needing it means the structure is fighting you.

2. Do not fork a component to change how it looks. If a class and a token together cannot express it, that is a gap worth reporting.

3. Do not target a `svelte-` hash. It changes on every build and is not part of the contract.
