# SEO and social cards

Every page can declare per page metadata that gets written to `<head>` so search engines and social media crawlers see the right values. The plugin parses the frontmatter at build time. The runtime applies the resolved tags to `document.head` on every navigation.

## Frontmatter

```yaml
---
title: Bookable API
description: HTTP API reference for the Bookable service.
meta:
  description: Override of the page level description for SEO only.
  canonical: https://developer.samna.io/api/bookable
  robots: index,follow
  keywords: [booking, api, openapi]
  author: Samna
  themeColor: '#CC785C'
  og:
    title: Bookable API
    description: HTTP API reference for the Bookable service.
    type: article
    image: /og/bookable.png
    imageAlt: Bookable API reference card.
    siteName: Samna Developer Docs
    locale: en_US
  twitter:
    card: summary_large_image
    site: '@samnaio'
    creator: '@samnaio'
    title: Bookable API
    description: HTTP API reference for the Bookable service.
    image: /og/bookable.png
    imageAlt: Bookable API reference card.
  jsonLd:
    '@context': https://schema.org
    '@type': TechArticle
    headline: Bookable API
---
```

## Defaults

1. Omitted `meta.description` falls back to `frontmatter.description`.

2. Omitted `meta.canonical` falls back to the absolute URL of the current page, derived from `site.url` if set.

3. Omitted `meta.og.title` and `meta.twitter.title` fall back to `frontmatter.title`.

4. Omitted `meta.twitter.card` is `summary_large_image` when an image is present and `summary` otherwise.

5. Omitted `meta.og.image` and `meta.twitter.image` fall back to `site.ogImage` if set.

## Site level fallbacks

Pass `site` to `createNimpressApp`:

```ts
createNimpressApp({
  title: 'Samna Developer Docs',
  contentRoot: 'docs',
  site: {
    title: 'Samna Developer Docs',
    url: 'https://developer.samna.io',
    description: 'API references, libraries, and tools.',
    ogImage: '/og/default.png',
    twitterSite: '@samnaio',
    locale: 'en_US'
  },
  manifest,
  searchIndex,
  pageLoader: pages
}).mount(document.getElementById('app')!)
```

Site values are used for every page unless the page overrides them.

## JSON-LD

`meta.jsonLd` accepts either a string or an object. Objects are serialized to JSON and emitted as `<script type="application/ld+json">`.

## Runtime behaviour

`setPageMeta(shell)` is called by the page shell when the page mounts. It clears any previously injected `data-np-meta` tags and writes the resolved set. Untagged `<head>` content authored in `index.html` is left untouched.
