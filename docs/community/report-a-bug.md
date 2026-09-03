---
title: Report a bug
order: 3
tags: Community
description: What a bug report needs so it can be reproduced and fixed.
---

nimpress is an actively maintained project, and bugs are fixed fastest when the report carries a reproduction. This page says what to include.

## Before creating an issue

1. Upgrade to the latest release and check whether the bug is still there. See [How to upgrade](/get-started/upgrade).

2. Run `nimpress lint`; a content problem prints the file and the fix, and is not a bug in nimpress.

3. Search the [changelog](/changelog) for the behavior; a change you did not expect may be a documented one.

## Issue template

The repository has issues disabled, so a report reaches the maintainers as a pull request adding a markdown file under `docs/community/reports/`, or directly by message. Whichever channel, carry these fields.

### Title

A one sentence summary that names the surface and the symptom: `The tabs anchor loses its hash after a click`.

### Description

What you saw and what you expected, in two short paragraphs.

### Reproduction

The smallest site that shows the bug: a config, one or two markdown pages, and the command you ran. A zipped folder or a repository link both work.

### Steps to reproduce

The exact commands and clicks, numbered, from a fresh install to the symptom.

### Environment

The nimpress version, the node version, the package manager, the operating system, and the browser with its version.

### Screenshots

A before and an after when the bug is visual, or the terminal output when it is a build or a lint failure.

## Checklist

1. Latest release, lint clean, changelog searched.

2. Reproduction attached and steps numbered.

3. Environment listed.
