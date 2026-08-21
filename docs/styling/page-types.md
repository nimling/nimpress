---
title: Page types
order: 64
description: Hero bands, changelog entries, roadmap timelines, database pages, and the component workshop, all the chrome a page type adds around the prose.
---

Hero bands, changelog entries, roadmap timelines, database pages, and the component workshop, all the chrome a page type adds around the prose.

195 classes, listed per component. Every one is an override point: write a rule for it in your own stylesheet and it wins, because everything nimpress ships sits in the `nimpress` cascade layer. See [Styling](/styling) for how that works and [Theming](/theming) for the tokens.

```css
.np-prose {
  border-bottom: 2px solid var(--np-brand);
}
```

## HeroPage

`src/markdown/HeroPage.svelte`

| Class |
|---|
| `np-hero-align` |
| `np-hero-align-center` |
| `np-hero-align-end` |
| `np-hero-align-start` |
| `np-hero-art` |
| `np-hero-banner` |
| `np-hero-body` |
| `np-hero-copy` |
| `np-hero-eyebrow` |
| `np-hero-has-banner` |
| `np-hero-inner` |
| `np-hero-lead` |
| `np-hero-logo` |
| `np-hero-side` |
| `np-hero-tagline` |
| `np-hero-title` |

## ChangelogPage

`src/markdown/ChangelogPage.svelte`

| Class |
|---|
| `np-changelog` |
| `np-changelog-body` |
| `np-changelog-chev` |
| `np-changelog-description` |
| `np-changelog-empty` |
| `np-changelog-entry-date` |
| `np-changelog-entry-heading` |
| `np-changelog-entry-title` |
| `np-changelog-header` |
| `np-changelog-hero` |
| `np-changelog-hero-inner` |
| `np-changelog-meta` |
| `np-changelog-section` |
| `np-changelog-title` |
| `np-changelog-version` |
| `np-page-backdrop-changelog` |
| `np-subscribe-btn` |
| `np-subscribe-label` |

## RoadmapPage

`src/markdown/RoadmapPage.svelte`

| Class |
|---|
| `np-rm-node` |
| `np-roadmap-aside` |
| `np-roadmap-aside-body` |
| `np-roadmap-aside-changelog` |
| `np-roadmap-aside-date` |
| `np-roadmap-aside-desc` |
| `np-roadmap-aside-head` |
| `np-roadmap-aside-ref-date` |
| `np-roadmap-aside-ref-title` |
| `np-roadmap-aside-version` |
| `np-roadmap-card-kind` |
| `np-roadmap-edge` |
| `np-roadmap-edges` |
| `np-roadmap-empty` |
| `np-roadmap-eyebrow` |
| `np-roadmap-footer-text` |
| `np-roadmap-hero` |
| `np-roadmap-hero-body` |
| `np-roadmap-hero-tagline` |
| `np-roadmap-hero-title` |
| `np-roadmap-issue-dot` |
| `np-roadmap-modal-content` |
| `np-roadmap-modal-placed` |
| `np-roadmap-modal-root` |
| `np-roadmap-page` |
| `np-roadmap-planet` |
| `np-roadmap-planet-box` |
| `np-roadmap-planet-fade` |
| `np-roadmap-planet-globe` |
| `np-roadmap-rocket` |
| `np-roadmap-rocket-link` |
| `np-roadmap-shell` |
| `np-roadmap-spine-connector` |
| `np-roadmap-spine-path` |
| `np-roadmap-spine-trail` |
| `np-roadmap-today` |
| `np-roadmap-today-label` |
| `np-roadmap-today-line` |
| `np-roadmap-top-arrow` |
| `np-roadmap-track` |
| `np-roadmap-travel` |

## RoadmapNode

`src/markdown/RoadmapNode.svelte`

| Class |
|---|
| `np-rm-node-bug` |
| `np-rm-node-date` |
| `np-rm-node-desc` |
| `np-rm-node-epic` |
| `np-rm-node-feature` |
| `np-rm-node-head` |
| `np-rm-node-inner` |
| `np-rm-node-kind` |
| `np-rm-node-meta` |
| `np-rm-node-title` |

## DbmlPage

`src/markdown/DbmlPage.svelte`

| Class |
|---|
| `np-dbml-banner` |
| `np-dbml-canvas` |
| `np-dbml-desc` |
| `np-dbml-eyebrow` |
| `np-dbml-footer` |
| `np-dbml-head` |
| `np-dbml-head-center` |
| `np-dbml-head-end` |
| `np-dbml-head-inner` |
| `np-dbml-lead` |
| `np-dbml-logo` |
| `np-dbml-page` |
| `np-dbml-prose` |
| `np-dbml-title` |
| `np-dbml-wrapper` |

## ComponentPage

`src/markdown/ComponentPage.svelte`

| Class |
|---|
| `np-component-badges` |
| `np-component-claude` |
| `np-component-claude-head` |
| `np-component-claude-missing` |
| `np-component-claude-path` |
| `np-component-claude-save` |
| `np-component-desc` |
| `np-component-head` |
| `np-component-package` |
| `np-component-preview` |
| `np-component-preview-frame` |
| `np-component-preview-head` |
| `np-component-preview-open` |
| `np-component-system` |
| `np-component-title` |
| `np-console` |
| `np-console-debug` |
| `np-console-error` |
| `np-console-info` |
| `np-console-input` |
| `np-console-result` |
| `np-console-warn` |
| `np-control-error` |
| `np-editor` |
| `np-panel` |
| `np-panel-body` |
| `np-panel-console` |
| `np-vf` |
| `np-vf-achromatomaly` |
| `np-vf-achromatopsia` |
| `np-vf-deuteranomaly` |
| `np-vf-deuteranopia` |
| `np-vf-protanomaly` |
| `np-vf-protanopia` |
| `np-vf-tritanomaly` |
| `np-vf-tritanopia` |
| `np-ws` |
| `np-ws-console-args` |
| `np-ws-console-body` |
| `np-ws-console-count` |
| `np-ws-console-editor` |
| `np-ws-console-empty` |
| `np-ws-console-filter` |
| `np-ws-console-level` |
| `np-ws-console-log` |
| `np-ws-console-prompt` |
| `np-ws-console-repl` |
| `np-ws-console-row` |
| `np-ws-console-scroll` |
| `np-ws-console-time` |
| `np-ws-console-toolbar` |
| `np-ws-controls` |
| `np-ws-crumb` |
| `np-ws-crumb-desc` |
| `np-ws-crumb-sep` |
| `np-ws-dialog` |
| `np-ws-dialog-backdrop` |
| `np-ws-dialog-body` |
| `np-ws-dialog-count` |
| `np-ws-dialog-head` |
| `np-ws-dialog-tabs` |
| `np-ws-dialog-tools` |
| `np-ws-dragging` |
| `np-ws-emits` |
| `np-ws-emits-head` |
| `np-ws-frame` |
| `np-ws-frame-inset` |
| `np-ws-frame-wrap` |
| `np-ws-props-actions` |
| `np-ws-props-empty` |
| `np-ws-props-head` |
| `np-ws-props-title` |
| `np-ws-slot` |
| `np-ws-slot-bottom` |
| `np-ws-slot-panels` |
| `np-ws-slot-panels-column` |
| `np-ws-slot-panels-row` |
| `np-ws-slot-panels-split` |
| `np-ws-slot-right` |
| `np-ws-stage` |
| `np-ws-tool` |
| `np-ws-tool-active` |
| `np-ws-tool-group` |
| `np-ws-tool-icon` |
| `np-ws-toolbar` |
| `np-ws-tools` |
| `np-ws-tools-menu-wrap` |
| `np-ws-tools-panel` |
| `np-ws-vision-backdrop` |
| `np-ws-vision-btn` |
| `np-ws-vision-defs` |
| `np-ws-vision-icon` |
| `np-ws-vision-item` |
| `np-ws-vision-panel` |
| `np-ws-vision-wrap` |
