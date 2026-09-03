---
title: Data tables
order: 33
tags: Authoring, Markdown
description: Markdown tables with column alignment, inline code, and icons in cells.
---

nimpress defines default styles for data tables, an excellent way of rendering tabular data in project documentation. A table takes the header, the row stripes, and the hover color from the tokens, so it follows the theme.

## Usage

Data tables can be used at any position in your project documentation and can contain arbitrary inline markdown, including inline code, links, icons, and emojis:

```md
| Method   | Description                          |
| -------- | ------------------------------------ |
| `GET`    | :lucide-check: Fetch resource        |
| `PUT`    | :lucide-check-check: Update resource |
| `DELETE` | :lucide-x: Delete resource           |
```

### Column alignment

If you want to align a specific column to the left, center or right, you can use the regular markdown syntax placing `:` characters at the beginning and end of the divider:

```md
| Method   | Description                          |
| :------- | :----------------------------------: |
| `GET`    | Fetch resource                       |
```

The docs authoring rule keeps the identifier in the first column and the description in the last, and no nested markdown in cells beyond inline code.

## Customization

The header background, the row stripe, and the hover color are `--np-table-header-bg`, `--np-table-row-alt`, and `--np-table-row-hover`. See [Theming](/theming).
