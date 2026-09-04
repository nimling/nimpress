---
title: SEO and social cards
sidebar:
  name: Setup
  path: setup
tags: Setup, SEO
order: 10
---

Every page can declare per page metadata that gets written to `<head>` so search engines and social media crawlers see the right values. The plugin parses the frontmatter at build time. The runtime applies the resolved tags to `document.head` on every navigation.

## Frontmatter

```yaml
---
title: Bookable API
description: HTTP API reference for the Bookable service.
meta:
  description: Override of the page level description for SEO only.
  canonical: https://docs.example.io/api/bookable
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
    site: '@example'
    creator: '@example'
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
    url: 'https://docs.example.io',
    description: 'API references, libraries, and tools.',
    ogImage: '/og/default.png',
    twitterSite: '@example',
    locale: 'en_US'
  },
  manifest,
  searchIndex,
  pageLoader: pages
}).mount(document.getElementById('app')!)
```

Site values are used for every page unless the page overrides them.

## Configuration

### Automatic metadata

nimpress generates the keywords and the description of every page that has none authored, on every build, from the title, the headings, the tags, and the body by term frequency against the whole site. Add the following lines to your configuration:

```json
{
  "seo": { "auto": true }
}
```

The config sets the initial value per page and the frontmatter decides who wins: without `meta.override` the generated keywords and description replace authored ones, with `meta.override: true` the authored fields stay and generation only fills what is empty.

```yaml
---
meta:
  override: true
  keywords: [booking, api]
---
```

### AI crawlers

`seo.ai.index` set to `false` disallows every known ai crawler in `robots.txt`, `GPTBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`, and the rest, and adds `noai, noimageai` to the robots meta of every page. Add the following lines to your configuration:

```json
{
  "seo": { "ai": { "index": false } }
}
```

A page flips its own robots meta with `meta.ai`: `false` adds `noai, noimageai` on a site that allows crawling, `true` lifts the block for one page on a site that forbids it. `llms.txt` and `llms-full.txt` keep their own switch under `meta.llms`.

## Usage

### Generate a report

`nimpress seo` walks every page and prints what the build emits for it, the keywords, the description length, the robots directive, and whether the values are authored or generated, and writes the full set to `seo.map.json`:

```bash
nimpress seo
nimpress seo --out=reports/seo.json
```

### Write the generated fields

`--write` puts the generated keywords and description into each page's frontmatter under `meta`, only where the page has none, so they become authored values you edit from there:

```bash
nimpress seo --write
```


## JSON-LD

`meta.jsonLd` accepts either a string or an object. Objects are serialized to JSON and emitted as `<script type="application/ld+json">`.

## Runtime behaviour

`setPageMeta(shell)` is called by the page shell when the page mounts. It clears any previously injected `data-np-meta` tags and writes the resolved set. Untagged `<head>` content authored in `index.html` is left untouched.
