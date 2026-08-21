---
title: Shell
order: 62
description: The header, the sidebar, the breadcrumbs, the right rail, and the frame everything else renders inside.
---

The header, the sidebar, the breadcrumbs, the right rail, and the frame everything else renders inside.

64 classes, listed per component. Every one is an override point: write a rule for it in your own stylesheet and it wins, because everything nimpress ships sits in the `nimpress` cascade layer. See [Styling](/styling) for how that works and [Theming](/theming) for the tokens.

```css
.np-header {
  border-bottom: 2px solid var(--np-brand);
}
```

## App

`src/layout/App.svelte`

| Class |
|---|
| `np-app` |
| `np-aside` |
| `np-body` |
| `np-collapsed` |
| `np-drawer-backdrop` |
| `np-drawer-open` |
| `np-main` |
| `np-sidebar` |
| `np-sidebar-collapsed` |
| `np-tip` |
| `np-tooltip` |

## AppRoot

`src/layout/AppRoot.svelte`

| Class |
|---|
| `np-loading` |
| `np-spin` |
| `np-spinner` |

## BackToTop

`src/layout/BackToTop.svelte`

| Class |
|---|
| `np-back-to-top` |
| `np-back-to-top-in` |

## Breadcrumbs

`src/layout/Breadcrumbs.svelte`

| Class |
|---|
| `np-crumbs` |
| `np-crumbs-current` |
| `np-crumbs-item` |
| `np-crumbs-sep` |

## GatedPage

`src/layout/GatedPage.svelte`

| Class |
|---|
| `np-page-error` |
| `np-page-loading` |

## Header

`src/layout/Header.svelte`

| Class |
|---|
| `np-actions` |
| `np-brand` |
| `np-crumbs-slot` |
| `np-header` |
| `np-icon-btn` |
| `np-menu-btn` |
| `np-menu-icon` |
| `np-menu-line` |
| `np-menu-line-bot` |
| `np-menu-line-mid` |
| `np-menu-line-top` |
| `np-search-icon` |
| `np-search-label` |
| `np-search-trigger` |

## HomePage

`src/layout/HomePage.svelte`

| Class |
|---|
| `np-card` |
| `np-cards` |
| `np-hero` |

## RightToc

`src/layout/RightToc.svelte`

| Class |
|---|
| `np-toc` |
| `np-toc-label` |
| `np-toc-overlay` |
| `np-toc-strip` |
| `np-toc-strip-dot` |
| `np-toc-strip-dots` |
| `np-toc-strip-line` |
| `np-toc-wrap` |

## Sidebar

`src/layout/Sidebar.svelte`

| Class |
|---|
| `np-group-label-link` |
| `np-link` |

## SidebarNode

`src/layout/SidebarNode.svelte`

| Class |
|---|
| `np-chev` |
| `np-group` |
| `np-group-header` |
| `np-group-label` |
| `np-group-label-button` |
| `np-group-toggle` |
| `np-hidden-dot` |
| `np-items` |
| `np-node-icon` |
| `np-subgroup-button` |
| `np-subgroup-link` |
| `np-subgroup-row` |
| `np-subgroup-static` |
| `np-subgroup-toggle` |
| `np-subitems` |
