---
title: Hero page
type: hero
order: 31
noToc: true
data:
  eyebrow: Example
  tagline: This page is the example.
  lead: Everything below the band is the markdown that produced it.
  align: start
---

:::actions
[Primary](/examples){"variant":"primary"}
[Secondary](/page-types/hero){"variant":"secondary"}
[Ghost](https://github.com/nimling/nimpress){"variant":"ghost"}
:::

::::features
:::feature {"title":"A feature card","link":"/page-types/hero"}
Each card is one `:::feature` block. The title and the link come from the JSON on the fence, the body is markdown.
:::

:::feature {"title":"Cards wrap","link":"/extensions/markdown"}
The grid is responsive. Add as many cards as the page needs and they reflow.
:::

:::feature {"title":"Links are optional","link":""}
Leave `link` empty and the card renders as plain content instead of a link.
:::
::::

## The whole file

The band, the buttons, and the grid above come from this frontmatter and these two directives.

```md
---
title: Hero page
type: hero
noToc: true
data:
  eyebrow: Example
  tagline: This page is the example.
  lead: Everything below the band is the markdown that produced it.
  align: start
---

:::actions
[Primary](/examples){"variant":"primary"}
[Secondary](/page-types/hero){"variant":"secondary"}
[Ghost](https://github.com/nimling/nimpress){"variant":"ghost"}
:::

::::features
:::feature {"title":"A feature card","link":"/page-types/hero"}
Each card is one `:::feature` block.
:::
::::

Prose after the grid renders as a normal page body.
```

## What each field does

1. `data.eyebrow` is the small label above the title.

2. `data.tagline` is the oversized line. `data.lead` is the paragraph under it.

3. `data.logo` and `data.banner` add an image above the title and a background behind the band. Both take a root relative path resolved against the site base.

4. `data.align` is `start`, `center`, or `end`.

5. `noToc: true` removes the right rail, which a hero page has no use for.

## The directives

`:::actions` wraps a list of markdown links. The JSON after each link picks the button variant: `primary`, `secondary`, or `ghost`.

`::::features` wraps `:::feature` blocks, one per card, each carrying `title` and `link` in its JSON. Note the four colons on the outer fence and three on the inner ones.

The full field list is in [Hero pages](/page-types/hero), and [the site home page](/) is a second working example.
