---
title: Nimpress
description: The Svelte docs framework that renders this site and every other Samna docs surface.
---

## Overview

Nimpress is a Svelte 5 documentation framework. It turns a folder of markdown into a full docs site with a sidebar, search, an OpenAPI renderer, changelogs, and roadmaps. It also ships a docs sync action that mirrors this folder into the central docs site.

## Authoring

Write markdown under the content folder. Each file becomes a page, and folders become sidebar groups. Frontmatter sets the title and the page type.

## Distribution

A repo keeps its docs in a `.nimpress` folder. On a version tag it notifies the docs site, which mirrors the folder into its own tree under a mapped path and publishes through the configured approach, either a direct commit or a review pull request.
