---
type: React Component
title: Ctf Hero Banner
description: CtfHeroBanner renders a large introductory banner assembled from Contentful data, combining rich text content, an optional background asset, and an optional call-to-action link, styled according to the site's theme.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

The rich text is delegated to CtfRichtext for consistent formatting of the banner's headline and body copy, while the visual background comes from a Contentful asset resolved via the generated ctf-asset fragment. Layout sizing accounts for the fixed header by referencing HEADER_HEIGHT and HEADER_HEIGHT_MD, and coloring is derived from the active palette through getColorConfigFromPalette, so the banner adapts to whatever theme variant a page uses. Any link out of the banner, such as a call-to-action button, is typed using the generated page-link fragment.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within the banner {kind: sync}
- [Theme](theme.md) — Sizes and colors the banner using theme constants {kind: sync}
- [Page Link](page-link.md) — Links the banner's call-to-action to a page {kind: sync}
- [Ctf Asset](ctf-asset.md) — Displays a background asset behind the banner content {kind: sync}
