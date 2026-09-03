---
title: Pricing
type: pricing
status: new
order: 45
description: Three tiers with a price, a benefit list, and one action each, the middle one highlighted, rendered from frontmatter data.
hide:
  - toc
data:
  footnote: Prices are placeholders. Every tier on this page is invented for the example.
  tiers:
    - name: Community
      price: Free
      description: Everything in the open source package.
      benefits:
        - Every page type and every renderer
        - The component workshop
        - Community support on GitHub
      action:
        text: Get started
        link: /getting-started
        variant: secondary
    - name: Spark
      price: "€49"
      period: per month
      description: Early access and a direct line to the team.
      highlight: true
      benefits:
        - Early access to new features
        - Hands on migration support
        - Access to the team
      action:
        text: Join Spark
        link: /changelog
    - name: Enterprise
      price: Custom
      description: A plan shaped around your organization.
      benefits:
        - Everything in Spark
        - A shared roadmap
        - Priority fixes
      action:
        text: Talk to us
        link: https://github.com/nimling/nimpress
        variant: ghost
---

Three placeholder tiers from the `tiers` list in the frontmatter, with the middle one highlighted.
