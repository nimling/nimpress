---
title: Browser support
order: 6
tags: Setup
description: The browsers the rendered site targets and the css features the tokens rely on.
---

nimpress tries to support the largest possible range of browsers while making it easy to customize the theme using modern CSS features like custom properties, cascade layers, and container queries.

## Supported browsers

The following table lists all browsers for which nimpress offers full support, so it can be assumed that all features work without degradation.

| Browser | Version | Notes |
|---|---|---|
| Chrome | 118 and later | Cascade layers, container queries, MathML for the math renderer, and `@scope` for the component scoped styles. |
| Edge | 118 and later | Same engine as Chrome. |
| Firefox | 128 and later | Container queries arrive in 110, MathML has always been there, and `@scope` for the component scoped styles in 128. |
| Safari | 17.4 and later | Container queries, cascade layers, and `@scope`. |

Every stylesheet nimpress ships sits in the `nimpress` cascade layer, so a site rule wins without `!important`; a browser without cascade layers loses that guarantee. Formulas render as MathML, so a browser without MathML shows the source instead. The component workshop, the schema viewer, and the diagrams need a browser with ES modules and dynamic imports, which every browser in the table has.
