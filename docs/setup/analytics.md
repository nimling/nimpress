---
title: Site analytics
order: 9
tags: Setup
description: The was this page helpful widget, the provider that receives every click, and the client module that replaces it.
---

As with any other service offered on the web, understanding how your project documentation is actually used can be an essential success factor. nimpress ships a feedback widget that pages opt into, sends every click to the provider named in the config, and hands the same click to the site's client module for any analytics of your choice.

## Configuration

### Was this page helpful?

A simple feedback widget can be included at the bottom of each page, encouraging users to give instant feedback whether a page was helpful or not. The config declares it and a page shows it, the way the subscribe control works on a changelog. Add the following lines to your configuration:

```json
{
  "feedback": {
    "title": "Was this page helpful?",
    "ratings": [
      { "icon": "👍", "name": "This page was helpful", "data": "1", "note": "Thanks for your feedback!" },
      { "icon": "👎", "name": "This page could be improved", "data": "0", "note": "Thanks for your feedback! Help us improve this page by [opening an issue](https://github.com/nimling/nimpress)." }
    ]
  }
}
```

| Property | Description |
|---|---|
| `title` | The question rendered above the rating buttons. |
| `icon` | The glyph on the rating button. |
| `name` | The accessible label and the title of the rating button, sent with the click. |
| `data` | The value sent with the click. |
| `note` | One markdown line shown in place of the buttons after the click. |

### Feedback provider

Every click posts a json body with `path`, `data`, and `name` to the endpoint, with credentials and the app slug header the auth provider expects. Add the following lines to your configuration:

```json
{
  "feedback": {
    "endpoint": "https://auth.example.io/api/feedback",
    "appSlug": "samna-developer"
  }
}
```

Without an endpoint and without a client function nothing is sent anywhere; the widget still shows its note.

## Usage

### Show the feedback widget

The widget shows on a page that opts in with the frontmatter `feedback` property. Add the following lines at the top of a markdown file:

```yaml
---
feedback: true
---
```

To show it under every page, set it once in the config and let a page that does not want it turn it off with `feedback: false`:

```json
{
  "defaultFrontmatter": { "feedback": true }
}
```

## Customization

### Custom site feedback

A custom feedback integration replaces the post to the endpoint with a function. Export `feedbackFunctions` from the module named by the `client` config field, the way `subscribeFunctions` replaces the subscribe post:

```ts
import type { FeedbackFunctions } from '@nimtech/nimpress'

export const feedbackFunctions: FeedbackFunctions = {
  async feedback(ctx, path, data, name) {
    window.plausible?.('feedback', { props: { path, data, name } })
  }
}
```

`ctx` carries the endpoint, the app slug, the headers, and the viewer. Every click also dispatches `nimpress:feedback` on `document` with the same fields, for a script that only listens.
