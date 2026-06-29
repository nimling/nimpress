---
title: Nimpress
description: The Svelte docs framework that renders this site and every other Samna docs surface.
---

## Overview

Nimpress is a Svelte 5 documentation framework. It turns a folder of markdown into a full docs site with a sidebar, search, an OpenAPI renderer, changelogs, and roadmaps.

## Authoring

Write markdown under the content folder. Each file becomes a page, and folders become sidebar groups. Frontmatter sets the title and the page type.

## Distribution

A repo keeps its docs in a `.nimpress` folder. On change it notifies the docs site, which mirrors the folder into its own tree and publishes.
