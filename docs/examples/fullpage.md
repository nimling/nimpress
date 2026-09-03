---
title: Full page
type: fullpage
status: new
order: 43
description: A landing page with a band, an action row, a feature grid, and a prose section, and none of the shell chrome.
data:
  eyebrow: Example
  tagline: A page that renders under the header alone.
  lead: No sidebar, no breadcrumbs, no rail. The band and every section below it span the viewport.
  align: center
---

:::actions {"align":"center"}
[Read the page type](/page-types/fullpage){"variant":"primary"}
[Back to the examples](/examples){"variant":"secondary"}
:::

::::features {"columns":3}
:::feature {"icon":"⚡","title":"Edge to edge","link":"/page-types/fullpage"}
The body spans the viewport, and `data.width` set to `content` narrows it back to the doc column.
:::

:::feature {"icon":"🧭","title":"No chrome","link":"/frontmatter"}
The type hides the sidebar, the breadcrumbs, the rail, and the previous and next links by itself.
:::

:::feature {"icon":"🎯","title":"Same blocks","link":"/extensions/markdown"}
Action rows, feature grids, and cards are the section blocks, the same directives every page uses.
:::
::::

## A prose section

Headings and paragraphs between the blocks read as sections. This one sits under the feature grid and above the footer, in the full width the page owns.
