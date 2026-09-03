---
title: Images
order: 28
tags: Authoring, Markdown
description: Image alignment, captions, lazy loading, light and dark variants, and a lightbox.
---

While images are first-class citizens of markdown and part of the core syntax, it can be difficult to work with them. nimpress makes working with images more comfortable, providing styles for image alignment and image captions.

## Usage

### Image alignment

Images can be aligned by adding the respective alignment direction via the `align` attribute, `align=left` or `align=right`. The image floats beside the paragraphs that follow it until the next heading:

```md
![Image title](./image.png){align=left}
```

### Image captions

An image alone in a paragraph with a title renders as a figure with the title as its caption:

```md
![Image title](./image.png "Image caption")
```

### Image lazy-loading

Every image after the first one on a page carries `loading="lazy"`, so browsers fetch it only when the reader scrolls near it. Nothing needs to be written for it.

### Light and dark mode

If you want to show different images for light and dark color schemes, you can append a `#only-light` or `#only-dark` hash fragment to the image URL:

```md
![Image title](./image-light.png#only-light)
![Image title](./image-dark.png#only-dark)
```

### Lightbox and zoom

An image with the `zoom` class opens full size in a lightbox on click, closed by escape or a click outside:

```md
![Image title](./image.png){.zoom}
```

To open every image in the prose that way, add the following lines to your configuration:

```json
{
  "images": {
    "lightbox": true
  }
}
```

See [Formatting and images](/examples/formatting) for every form rendered.


