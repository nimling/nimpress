---
title: Repository
order: 8
tags: Setup
description: The repository link in the header and the edit and view actions on every doc page.
---


If your documentation is related to source code, nimpress provides the ability to display information about the project's repository as part of the static site. The `github` field renders the repository link in the header, and `repo` adds actions to every doc page.

### Content actions

nimpress can display code action buttons that allow a reader to navigate to the source code of the current page in a hosted repository such as GitHub. `url` defaults to the `github` field, `editUri` to `edit/main/<contentDir>/`, and the view action swaps `edit` for `blob`. Add the following lines to your configuration:

```json
{
  "repo": {
    "actions": ["edit", "view"]
  }
}
```

If you use a custom branch name or content folder, change `editUri` to the path component of the edit url in your repository, `edit/develop/documentation/` for a `develop` branch and a `documentation` folder.

