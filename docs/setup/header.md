---
title: Header
order: 6
tags: Setup
description: The announcement bar above the header, and the title, the logo, the repository link, and the routes the header carries.
---

The header can be customized to show an announcement bar that disappears upon scrolling, and provides some options for further configuration. It also includes the search bar and a place to display your project's git repository, as explained in [Search](/search) and [Repository](/setup/repository).

## Configuration

### Title, logo, and routes

`title` is the site name in the header and the tab, `logo` the mark beside it, `github` the repository link at the right, and `navRoutes` extra links beside the search. Add the following lines to your configuration:

```json
{
  "title": "Docs",
  "logo": "/assets/logo.svg",
  "github": "https://github.com/nimling/nimpress",
  "navRoutes": [{ "text": "API", "link": "/api" }]
}
```

### Announcement bar

nimpress includes an announcement bar, which is the perfect place to display project news or other important information to the user. When the user scrolls past the header, the bar will automatically disappear. `text` is one markdown line, and `link` wraps the whole bar in a link. Add the following lines to your configuration:

```json
{
  "announce": {
    "text": "Version 2.4 is out.",
    "link": "/changelog"
  }
}
```

### Mark as read

For temporary announcements that can be marked as read by the user, a button to dismiss the current announcement can be included. Add the following lines to your configuration:

```json
{
  "announce": {
    "text": "Version 2.4 is out.",
    "dismiss": true
  }
}
```

When the user clicks the button, the current announcement is dismissed and not displayed again until the content of the announcement changes.

