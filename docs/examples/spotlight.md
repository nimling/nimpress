---
title: Spotlight
type: spotlight
status: new
order: 46
description: A page rendered by a custom Svelte page type declared in the config, with a schema for its data.
data:
  kicker: Custom page type
  accent: "#2563eb"
---

This page is rendered by `docs/types/Spotlight.svelte`, registered in the config as the `spotlight` type. The band above is the component's own markup and the prose below is the built in `Page` renderer the component composes. `Spotlight.schema.json` beside the component makes `data.kicker` required, so lint fails a page without it.
