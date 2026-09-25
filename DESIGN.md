---
name: nimpress
description: A markdown docs engine whose every visual decision is a token or a public np- class, shipped as the stock theme and the glass variant.
colors:
  brand: "#A85A3F"
  brand-hover: "#8C492F"
  brand-soft: "rgba(168, 90, 63, 0.12)"
  link: "#8C492F"
  paper: "#FFFFFF"
  paper-surface: "#F4F4F5"
  paper-sidebar: "#FAFAFA"
  code-inline: "#ECECEE"
  code-night: "#0B1020"
  ink: "#09090B"
  ink-secondary: "#3F3F46"
  ink-muted: "#52525B"
  ink-faint: "#71717A"
  border: "#C8C8CC"
  border-strong: "#A1A1AA"
  divider: "#D4D4D8"
  glass-field: "#F2EAE6"
  glass-surface: "#EBE3DF"
  glass-lamp: "rgb(168 90 63 / 0.62)"
  glass-ink-brand: "#6E3A28"
  glass-ground: "rgb(255 253 251 / 0.66)"
  glass-cover: "rgb(255 255 255 / 0.8)"
  glass-slip: "rgb(255 255 255 / 0.62)"
  glass-edge: "rgb(255 255 255 / 0.85)"
  glass-rim: "rgb(60 40 30 / 0.1)"
  glass-code: "#1F1714"
  glass-ink: "#1A1614"
  glass-ink-secondary: "#3D3531"
  glass-ink-muted: "#5A504B"
  glass-ink-faint: "#6F6560"
  glass-border: "rgb(60 40 30 / 0.14)"
typography:
  display:
    fontFamily: "Inter var, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "4.75em"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter var, ui-sans-serif, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter var, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  subtitle:
    fontFamily: "Inter var, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter var, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
    fontFeature: "\"cv11\", \"ss01\""
  label:
    fontFamily: "Inter var, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.08em"
  code:
    fontFamily: "ui-monospace, JetBrains Mono, Fira Code, SF Mono, Menlo, Consolas, monospace"
    fontSize: "13.5px"
    lineHeight: 1.6
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
  glass-sm: "8px"
  glass-md: "12px"
  glass-lg: "18px"
spacing:
  header-height: "64px"
  sidebar-width: "288px"
  toc-width: "224px"
  content-max: "1024px"
components:
  sidebar-link-active:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  callout:
    rounded: "{rounded.md}"
    padding: "12px 16px"
  code-block:
    backgroundColor: "{colors.code-night}"
    rounded: "{rounded.md}"
  glass-chrome:
    backgroundColor: "{colors.glass-ground}"
    textColor: "{colors.glass-ink}"
    height: "{spacing.header-height}"
  glass-sidebar-link-active:
    backgroundColor: "{colors.glass-cover}"
    textColor: "{colors.glass-ink-brand}"
    rounded: "{rounded.glass-md}"
  glass-slip:
    backgroundColor: "{colors.glass-slip}"
    textColor: "{colors.glass-ink}"
    rounded: "{rounded.glass-lg}"
    padding: "20px"
  glass-rail:
    backgroundColor: "{colors.glass-ground}"
    rounded: "{rounded.glass-md}"
    padding: "14px 16px"
  announce:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "14px 12px 14px 16px"
    width: "min(380px, calc(100vw - 32px))"
---

# Design System: nimpress

## Overview

**Creative North Star: "Glass Laid on Light"**

nimpress ships two themes over one surface. `stock` is the default: tokens in `src/styles/tokens.css`, the reading styles in `src/styles/preflight.css`, and the component styles, all inside `@layer nimpress`. It is a quiet neutral paper with one warm brand color used as ink for the page title, the active row and links. `glass` is the variant: `src/styles/themes/glass.css`, loaded as `@nimtech/nimpress/themes/glass.css` when the config sets `theme: glass`, wrapped in `@layer nimpress-theme`, and written only against `--np-*` tokens and public `np-` classes. The theme owns no component.

In glass the brand color becomes a lamp. One radial bloom lights the field from the top left corner behind the sidebar and header. The chrome, header, sidebar and rail, is heavy ground glass with grain. The reading content sits directly on the lit field with no sheet around it and scrolls under the header, which is clear at rest and frosts in as content passes behind it. Cards, feature cards and callouts are slips: lighter glass that lies on the field. Controls, tables, tabs, the search trigger and the pager keep their stock surfaces. State lives in the glass edge.

Both themes are warm neutrals tinted by the brand, dense enough for long reference sessions, and let the prose win over the chrome.

**Key Characteristics:**
- One brand color, `--np-brand`, drives both themes; glass mixes every surface from it.
- Stock is flat paper with hairline borders and near invisible shadows.
- Glass is three glasses over one lit field: ground, cover, slip.
- Content never sits in a sheet in glass; only the chrome and slips are glass.
- Every glass surface falls back to solid under reduced transparency or more contrast.

## Colors

A warm neutral ramp carried by one terracotta brand; glass shifts the neutrals toward the brand and makes the surfaces translucent.

### Primary
- **Terracotta** (`brand`): page H1, the H2 lead segment, H5 labels, the hero title, the active sidebar row, the announce mark. Dark mode lifts it to `#CC785C`. A site overrides it through `brand.primary` in the config and every theme follows.
- **Burnt Terracotta** (`brand-hover`, `link`): link text and brand hover.
- **Terracotta Wash** (`brand-soft`): halos and tinted fills behind brand marks.
- **Deep Glass Ink** (`glass-ink-brand`): glass only. The brand mixed 70% into black (72% into white in dark) so brand text stays AA over translucent glass: active rows, prose links, hero title, focus ring.
- **The Lamp** (`glass-lamp`): glass only. The brand at 62% opacity (46% in dark) in one fixed radial gradient, `ellipse 85% 95% at 0% 0%`, fading out by 68%.

### Neutral
- **Paper** (`paper`, `paper-surface`, `paper-sidebar`): stock page, raised surfaces and sidebar. Dark `#0F0F10`, `#18181B`, `#0F0F10`.
- **Lit Field** (`glass-field`, `glass-surface`): glass page and raised surfaces, the brand mixed 7% and 5% into warm off whites. Dark mixes 6% into `#0D0B0A` and `#1A1715`.
- **Zinc Ink** (`ink` to `ink-faint`): stock text ramp.
- **Warm Ink** (`glass-ink` to `glass-ink-faint`): glass text ramp, brown blacks. Dark `#F6F1EE`, `#CFC5BF`, `#A89D97`, `#8A807A`.
- **Hairlines** (`border`, `border-strong`, `divider`): stock solid greys. Glass replaces them with warm alpha lines (`glass-border`, 0.26 strong, 0.1 divider).
- **Night Code** (`code-night`, `glass-code`): code blocks stay dark in both modes. Glass tints the block 7% toward the brand.
- **Glass surfaces** (`glass-ground`, `glass-cover`, `glass-slip`): see Elevation & Depth.
- **Edge and Rim** (`glass-edge`, `glass-rim`): the bright 1px top highlight and the dark 1px outline every glass surface carries. Dark flips them to `rgb(255 245 238 / 0.1)` and `rgb(0 0 0 / 0.5)`.

Callout, method and status hues (`--np-tip`, `--np-note`, `--np-warning`, `--np-method-get` and the rest) are semantic and shared by both themes.

### Named Rules
**The One Brand Rule.** Every theme colors itself from `--np-brand`. A theme adds mixes of it, never a second accent.

**The Lamp Rule.** In glass the brand is light before it is ink: one bloom from the top left corner, fixed to the viewport. Never a second bloom, never a blob behind content.

**The Ink Over Glass Rule.** Brand text on any glass surface uses `glass-ink-brand`, never raw `--np-brand`, so it holds AA over whatever the glass shows through.

## Typography

**Display Font:** Inter var (with ui-sans-serif, system-ui)
**Body Font:** Inter var, the same stack, with `cv11` and `ss01`
**Label/Mono Font:** ui-monospace, JetBrains Mono, Fira Code, SF Mono, Menlo, Consolas

**Character:** One sans for everything, set tight at the top and loose in the body. Both themes use the stock stack and download no font.

### Hierarchy
- **Display** (800, 3.5em rising to 4.75em from 60em width, 1.05, -0.025em): the hero title only, in brand (glass: `glass-ink-brand`).
- **Headline** (700, 34px, 1.2, -0.015em): the page H1, in brand.
- **Title** (600, 26px, 1.3, -0.01em): H2, opened by a divider with a 48px, 2px brand segment at its leading end.
- **Subtitle** (600, 20px, 1.35): H3. H4 is 600 at 17px.
- **Body** (400, 16px, 1.7): prose, capped at `content-max` (1024px). Glass underlines prose links with a 45% brand line offset 0.2em that goes solid on hover.
- **Label** (700, 12px, 0.08em, uppercase): H6, sidebar group headers. H5 is the brand variant at 14px, 0.06em. Callout titles are 11px, 0.1em uppercase pills.
- **Code** (13.5px, 1.6): code blocks; inline code at 0.875em on `code-inline`.

### Named Rules
**The Stock Stack Rule.** A theme never changes `--np-font-sans` or `--np-font-mono` and never loads a font.

## Layout

The shell is one unconditional grid: header row, then sidebar and page columns, sized by `header-height` (64px), `sidebar-width` (288px), `toc-width` (224px) and `content-max` (1024px). The document never scrolls; `.np-main` does. Spacing has no token scale and stays on multiples of 4px per component.

Glass moves the header over the scroll area: header and body share grid row 1, `.np-main` pads its top by the header height and sets `scroll-padding-top` to match, and the sidebar starts `header-height + 24px` down so the lamp runs behind both. The page backdrop sheet is hidden. The rail becomes a frosted slip with 14px 16px padding; the collapsed rail strip is a pill.

At 1024px and below glass moves the scroll timeline and header offset to `.np-body`, and the sidebar drawer turns to solid `glass-cover`. Stock collapses the rail at 800px and card grids at 720px.

The announcement is a notification card fixed 20px from the bottom right, at most 380px wide, entering after 600ms. The header carries a sidebar panel toggle whose pane fills and whose chevron turns as the drawer opens.

### Named Rules
**The No Sheet Rule.** In glass, prose sits on the lit field. Never wrap page content in a card, panel or backdrop.

**The Clear At Rest Rule.** The glass header is transparent at scroll zero and frosts across the first 96px of the `--np-glass-scroll` timeline. Where scroll timelines are unsupported it is frosted from the start.

## Elevation & Depth

Stock is flat: hairline borders carry structure and shadows are near invisible (`0 1px 2px rgba(0,0,0,0.04)` on cards), rising only for popovers, modals and dialogs. Glass is layered: depth is the amount of frost and opacity, and every glass surface carries a bright 1px top edge (`inset 0 1px 0 var(--np-glass-edge)`) plus a rim. Glass shadows are long, soft and warm (`rgb(60 30 15)` in light, black in dark).

The three glasses:
- **Ground** (`glass-ground`, `blur(22px) saturate(170%)`, grain): the chrome. Header, sidebar, rail, back to top.
- **Cover** (`glass-cover`, same frost): the most opaque glass, for what must read over anything. Active row, search modal, tooltip, announcement, `kbd`, the mobile drawer.
- **Slip** (`glass-slip`, `blur(12px) saturate(150%)`): lighter glass lying on the field. Cards, feature cards, callouts.

Grain is an SVG fractal noise tile, 160px, at 0.14 alpha in light and 0.2 in dark, on ground glass only.

### Shadow Vocabulary
- **Card** (`--np-shadow-card`): stock `0 1px 2px rgba(0,0,0,0.04)`; glass `0 1px 1px rgb(60 30 15 / 0.04), 0 8px 24px -10px rgb(60 30 15 / 0.18)`. Slips and code.
- **Popover** (`--np-shadow-popover`): stock `0 12px 32px rgb(0 0 0 / 0.18)`; glass `0 2px 4px rgb(60 30 15 / 0.05), 0 18px 40px -12px rgb(60 30 15 / 0.28)`. Tooltip, announcement, back to top, lifted card.
- **Modal** (`--np-shadow-modal`): stock `0 10px 30px rgba(0,0,0,0.12)`; glass `0 2px 6px rgb(60 30 15 / 0.06), 0 30px 70px -20px rgb(60 30 15 / 0.35)`. Search.
- **Dialog** (`--np-shadow-dialog`): stock `0 24px 60px rgb(0 0 0 / 0.4)`; glass `0 2px 6px rgb(60 30 15 / 0.08), 0 40px 90px -24px rgb(60 30 15 / 0.45)`.

### Named Rules
**The Three Glasses Rule.** A glass surface is ground, cover or slip, set from its token. Never invent a fourth opacity or blur.

**The Doubled Edge Rule.** Glass state lives in the edge. The active row takes an inner 1px `glass-edge` line and an outer 1px ring of the brand at 36%, over a `0 4px 12px -6px` brand shadow at 50%.

**The Solid Fallback Rule.** Under `prefers-reduced-transparency: reduce` or `prefers-contrast: more`, every glass token turns solid, every frost turns `none`, and the header stops animating.

## Shapes

Softly rounded rectangles throughout. Stock uses `sm` 6px, `md` 8px, `lg` 12px and `pill`; glass rounds everything one step further to 8px, 12px and 18px through the same token names. Tables in glass clip to `md` with an inset rim. Pills are for chips, callout titles, the collapsed rail and status marks. Borders are 1px.

## Components

### Sidebar navigation
- **Stock:** rows in `ink-secondary`; the active row takes brand text at 500 and a 16% brand fill.
- **Glass:** hover keeps the stock row hover; the active row, group header or subgroup row becomes cover glass with `glass-ink-brand` text and the doubled edge. A nested active link inside an active subgroup drops its own edge.

### Header
- **Stock:** solid bar at `header-height` with a bottom border.
- **Glass:** ground glass with grain, top and bottom `glass-edge` lines, clear at rest. The search trigger keeps its stock surface. The sidebar scroller starts below the header so its rows never pass behind the clear header.

### Cards / Containers
- **Corner Style:** `lg` (12px stock, 18px glass).
- **Background:** stock `paper` with a `border`; glass `glass-slip` with a `glass-rim` border and light frost.
- **Hover:** stock turns the border to brand and takes the card shadow in 150ms. Glass lifts 2px, tints the border to a 45% brand mix and moves to the popover shadow in 240ms on `cubic-bezier(0.16, 1, 0.3, 1)`; the lift is removed under reduced motion.
- **Internal Padding:** 20px.

### Callouts
- **Stock:** `md` corners, 12px 16px padding, 10% fill of the callout hue, title as an uppercase pill in the callout hue.
- **Glass:** a slip tinted 9% by the callout hue with a 1px border of the hue at 32% on all sides; the title mixes the hue 72% into the text color for contrast.

### Code blocks
Dark in both modes. Glass tints the block toward the brand, outlines it with the rim, adds a 0.14 white top edge and the card shadow, and lifts the language bar to `rgb(255 255 255 / 0.07)`.

### Rail
Stock: plain list beside the prose. Glass: ground glass slip, `md` corners, edge and rim; the collapsed strip is a pill.

### Announcement
A bottom right notification card: an 8px brand dot with a 4px `brand-soft` halo, the text at 14px / 1.45, an SVG dismiss. Stock is `paper` with `border` and popover shadow; glass is cover glass with frost, rim and edge.

### Search
Glass: the backdrop blurs 6px, the modal is cover glass with the modal shadow and edge.

## Do's and Don'ts

### Do:
- **Do** color every theme from `--np-brand` and its mixes.
- **Do** write a theme only against `--np-*` tokens and public `np-` classes inside `@layer nimpress-theme`; a missing hook is added to the library.
- **Do** give every token a light and a dark value, and every glass token a solid value under reduced transparency and more contrast.
- **Do** set brand text over glass in `glass-ink-brand`.
- **Do** mark glass state with the doubled edge, not with a fill alone.
- **Do** pick ground for chrome, cover for what must read over anything, slip for what lies on the field.

### Don't:
- **Don't** wrap glass page content in a sheet or card.
- **Don't** add a second light source, blob or gradient beyond the one lamp.
- **Don't** frost the reading field itself.
- **Don't** change or download fonts in a theme.
- **Don't** write `!important` in a theme or the library.
