---
title: OpenAPI
order: 26
description: An OpenAPI 3.1 specification rendered as a reference surface, with a try panel and a download control.
---

nimpress renders an OpenAPI 3.1 specification as a full reference page. There is no inline form: the specification is the page.

## What it renders

1. One collapsible card per tag, one card per operation, with the method, the path, the summary, and the description run through the markdown pipeline.

2. Parameters, request bodies, and responses as tables, with `$ref` resolved on demand from a schema registry shipped once per page.

3. A try panel that sends the request from the browser, and code examples per language.

4. Deep links per operation, per schema, and per tag, so `#operation/PostOrder` opens and scrolls to that card.

5. A download control in the header handing the reader the specification as YAML or as JSON.

## Using it

Set `type: openapi` and point `spec` at a `.json` or `.yaml` file beside the markdown. The full field list and the layout are in [OpenAPI pages](/page-types/openapi).

```yaml
---
title: Pastry API
type: openapi
spec: ./pastries.yaml
---
```

## See it

The [OpenAPI reference example](/examples/openapi) renders a small specification with every part of the surface in place.
