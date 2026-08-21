---
title: Renderers
order: 65
description: The OpenAPI reference surface, the DBML diagram, and the inline component frame.
---

The OpenAPI reference surface, the DBML diagram, and the inline component frame.

199 classes, listed per component. Every one is an override point: write a rule for it in your own stylesheet and it wins, because everything nimpress ships sits in the `nimpress` cascade layer. See [Styling](/styling) for how that works and [Theming](/theming) for the tokens.

```css
.np-prose {
  border-bottom: 2px solid var(--np-brand);
}
```

## CodeExamples

`src/api/CodeExamples.svelte`

| Class |
|---|
| `np-examples` |
| `np-examples-bar` |
| `np-examples-body` |
| `np-examples-head` |
| `np-examples-title` |

## MethodBadge

`src/api/MethodBadge.svelte`

| Class |
|---|
| `np-method` |
| `np-method-lg` |
| `np-method-md` |
| `np-method-sm` |

## OpenApiRoot

`src/api/OpenApiRoot.svelte`

| Class |
|---|
| `np-api` |
| `np-api-actions` |
| `np-api-collapse-all` |
| `np-api-desc` |
| `np-api-download` |
| `np-api-download-error` |
| `np-api-download-menu` |
| `np-api-header` |
| `np-api-servers-table` |
| `np-api-title-row` |
| `np-api-toggle-all` |
| `np-api-version` |
| `np-flash` |
| `np-op-lazy` |
| `np-op-lazy-method` |
| `np-op-lazy-method-delete` |
| `np-op-lazy-method-get` |
| `np-op-lazy-method-patch` |
| `np-op-lazy-method-post` |
| `np-op-lazy-method-put` |
| `np-op-lazy-path` |
| `np-op-lazy-row` |
| `np-op-lazy-summary` |
| `np-schema-block` |
| `np-schemas-card` |
| `np-schemas-chev` |
| `np-schemas-grid` |
| `np-schemas-toggle` |
| `np-tag-card` |
| `np-tag-chev` |
| `np-tag-count` |
| `np-tag-head` |
| `np-tag-ops` |
| `np-tag-toggle` |

## Operation

`src/api/Operation.svelte`

| Class |
|---|
| `np-editor-host` |
| `np-op-body` |
| `np-op-card` |
| `np-op-collapsed` |
| `np-op-desc` |
| `np-op-desc-wrap` |
| `np-op-head` |
| `np-op-head-body` |
| `np-op-inline` |
| `np-op-inline-card` |
| `np-op-inline-skeleton` |
| `np-op-inline-sticky` |
| `np-op-path` |
| `np-op-shell` |
| `np-op-shimmer` |
| `np-op-summary` |
| `np-op-title-row` |
| `np-op-toggle` |
| `np-op-toggle-chev` |
| `np-op-top` |
| `np-op-try-side` |
| `np-resp` |
| `np-resp-code` |
| `np-resp-ct` |
| `np-resp-desc` |
| `np-resp-row` |
| `np-resp-tabs` |
| `np-resp-view` |
| `np-resp-view-example` |
| `np-resp-view-schema` |
| `np-responses` |
| `np-responses-head` |
| `np-responses-list` |
| `np-section` |
| `np-section-body` |
| `np-section-body-flush` |
| `np-section-body-responses` |
| `np-section-head` |
| `np-section-responses` |
| `np-try` |

## ParamRow

`src/api/ParamRow.svelte`

| Class |
|---|
| `np-param` |
| `np-param-desc` |
| `np-param-enum` |
| `np-param-enum-val` |
| `np-param-format` |
| `np-param-head` |
| `np-param-in` |
| `np-param-name` |
| `np-param-nested` |
| `np-param-required` |
| `np-param-type` |

## Schema

`src/api/Schema.svelte`

| Class |
|---|
| `np-chev-spacer` |
| `np-schema` |
| `np-schema-children` |
| `np-schema-desc` |
| `np-schema-enum` |
| `np-schema-enum-val` |
| `np-schema-format` |
| `np-schema-head` |
| `np-schema-name` |
| `np-schema-type` |

## TryDialog

`src/api/TryDialog.svelte`

| Class |
|---|
| `np-try-backdrop` |
| `np-try-body-empty` |
| `np-try-body-host` |
| `np-try-close` |
| `np-try-dialog` |
| `np-try-dialog-actions` |
| `np-try-dialog-cell` |
| `np-try-dialog-cell-body` |
| `np-try-dialog-cell-footer` |
| `np-try-dialog-cell-inputs` |
| `np-try-dialog-grid` |
| `np-try-dialog-head` |
| `np-try-dialog-head-actions` |
| `np-try-dialog-picker-row` |
| `np-try-dialog-title` |
| `np-try-meta` |
| `np-try-picker` |
| `np-try-picker-chev` |
| `np-try-picker-list` |
| `np-try-picker-opt-path` |
| `np-try-picker-opt-summary` |
| `np-try-picker-option` |
| `np-try-picker-path` |
| `np-try-picker-summary` |
| `np-try-picker-trigger` |
| `np-try-response-body` |
| `np-try-response-error` |
| `np-try-section-head` |
| `np-try-send` |
| `np-try-send-delete` |
| `np-try-send-get` |
| `np-try-send-label` |
| `np-try-send-patch` |
| `np-try-send-post` |
| `np-try-send-put` |
| `np-try-send-shortcut` |
| `np-try-shortcut` |
| `np-try-tab-panel` |
| `np-try-tab-status` |
| `np-try-tabs-bar` |

## TryPanel

`src/api/TryPanel.svelte`

| Class |
|---|
| `np-editor-bar` |
| `np-req` |
| `np-try-actions` |
| `np-try-body` |
| `np-try-body-editor` |
| `np-try-disabled` |
| `np-try-error` |
| `np-try-field` |
| `np-try-group` |
| `np-try-group-body` |
| `np-try-group-chev` |
| `np-try-group-fields` |
| `np-try-group-head` |
| `np-try-group-head-body` |
| `np-try-group-label` |
| `np-try-group-open` |
| `np-try-head` |
| `np-try-icon-btn` |
| `np-try-meta-icon` |
| `np-try-result` |
| `np-try-result-body` |
| `np-try-result-head` |
| `np-try-status` |
| `np-try-title` |

## DBMLBlock

`src/markdown/DBMLBlock.svelte`

| Class |
|---|
| `np-dbml-error` |
| `np-dbml-flush` |
| `np-dbml-fullscreen` |
| `np-dbml-hint` |
| `np-dbml-host` |
| `np-dbml-shield` |
| `np-dbml-shield-label` |
| `np-dbml-toolbar` |
| `np-erd-open` |
| `np-erd-table` |

## DbmlTable

`src/markdown/DbmlTable.svelte`

| Class |
|---|
| `np-erd-column` |
| `np-erd-column-flags` |
| `np-erd-column-hit` |
| `np-erd-column-key` |
| `np-erd-column-link` |
| `np-erd-column-name` |
| `np-erd-column-type` |
| `np-erd-columns` |
| `np-erd-flag` |
| `np-erd-flag-fk` |
| `np-erd-flag-pk` |
| `np-erd-index` |
| `np-erd-indexes` |
| `np-erd-table-head` |
| `np-erd-table-name` |
| `np-erd-table-note` |

## DbmlNote

`src/markdown/DbmlNote.svelte`

| Class |
|---|
| `np-erd-note` |
| `np-erd-note-body` |
| `np-erd-note-title` |

## ComponentEmbed

`src/markdown/ComponentEmbed.svelte`

| Class |
|---|
| `np-component-embed-host` |
| `np-component-embed-missing` |
