---
title: How to upgrade
order: 5
tags: Setup, Install
description: Read the changelog, bump the package, and run lint to catch what a release changed.
---

Check the [changelog](/changelog) to identify the version you would like to upgrade to. Remember that nimpress uses semantic versioning, so if you are upgrading from one major release version to another, please carefully study the entries marked as breaking.

## Upgrade

Bump the package to the version you picked and reinstall:

```bash
pnpm add @nimtech/nimpress@latest
```

Then run lint and build once, so a field a release renamed or a rule a release tightened shows up as a line in the terminal and not as a broken page on the host:

```bash
pnpm exec nimpress lint
pnpm exec nimpress build
```

## Versioning

nimpress follows semantic versioning.

1. A patch release fixes and adds without changing a contract. Every changelog entry lists what shipped.

2. A minor release adds page types, directives, and config fields. Nothing you wrote stops working.

3. A major release renames a public class, a token, or a frontmatter field. The changelog entry marks every such change with the word breaking and names the migration.

The public class names on rendered chrome and the token names are contracts. They change only across a major release, so a site stylesheet written against them keeps working through every minor and patch.
