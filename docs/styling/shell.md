---
title: Shell
order: 62
description: The header, the sidebar, the breadcrumbs, the right rail, and the frame everything else renders inside.
---

The header, the sidebar, the breadcrumbs, the right rail, and the frame everything else renders inside.

84 classes, listed per component. Every one is an override point: write a rule for it in your own stylesheet and it wins, because everything nimpress ships sits in the `nimpress` cascade layer. See [Styling](/styling) for how that works and [Theming](/theming) for the tokens.

```css
.np-header {
  border-bottom: 2px solid var(--np-brand);
}
```

## Announce

`src/layout/Announce.svelte`

| Class |
|---|
| `np-announce` |
| `np-announce-dismiss` |
| `np-announce-mark` |
| `np-announce-text` |

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
| `np-navigation-hidden` |
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

## Footer

`src/layout/Footer.svelte`

| Class |
|---|
| `np-footer` |
| `np-footer-copyright` |
| `np-footer-brand` |
| `np-footer-content` |
| `np-footer-end` |
| `np-footer-line` |
| `np-footer-meta` |
| `np-footer-nav` |
| `np-footer-nav-label` |
| `np-footer-nav-title` |
| `np-footer-next` |
| `np-footer-prev` |
| `np-footer-social` |
| `np-footer-social-glyph` |
| `np-footer-social-link` |

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
| `np-header-lead` |
| `np-icon-btn` |
| `np-menu-btn` |
| `np-menu-chevron` |
| `np-menu-fill` |
| `np-menu-icon` |
| `np-menu-pane` |
| `np-mode-toggle` |
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
| `np-home-card-title` |
| `np-home-lead` |
| `np-home-title` |

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
| `np-node-text` |
| `np-sidebar-status` |
| `np-sidebar-status-deprecated` |
| `np-sidebar-status-new` |
| `np-subgroup-button` |
| `np-subgroup-link` |
| `np-subgroup-row` |
| `np-subgroup-static` |
| `np-subgroup-toggle` |
| `np-subitems` |

## ThemeMenu

`src/layout/ThemeMenu.svelte`

| Class |
|---|
| `np-theme-menu` |
| `np-theme-menu-item` |
| `np-theme-menu-list` |
| `np-theme-menu-swatch` |
| `np-theme-menu-trigger` |

## DropdownMenu

`src/layout/DropdownMenu.svelte`, in the header and in the sidebar footer as `np-sidebar-foot`.

| Class |
|---|
| `np-dropdown` |
| `np-dropdown-chevron` |
| `np-dropdown-description` |
| `np-dropdown-head` |
| `np-dropdown-head-title` |
| `np-dropdown-item` |
| `np-dropdown-menu` |
| `np-dropdown-menu-up` |
| `np-dropdown-panel` |
| `np-dropdown-title` |
| `np-dropdown-trigger` |
| `np-dropdown-value` |
