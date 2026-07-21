---
type: React Component
title: Ctf Hero Banner
description: CtfHeroBanner is the React component behind Contentful's hero banner content block, rendering the large introductory section that sits at the top of a marketing page. It composes rich text copy, a call-to-action link, and a background or accompanying image into a single banner, pulling layout constants so the banner can account for the fixed site header when positioning its content.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Blocks
ddd_role: Presentational Component
---

The component depends on generated GraphQL fragment types for both its link and asset fields, meaning the data shape it consumes is defined by the Contentful content model rather than by local prop definitions. This ties the banner tightly to the CMS schema: editors control the heading text, link target, and image through Contentful, while this component is purely responsible for turning that data into the rendered hero section.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders the banner's rich text copy {kind: sync}
- [Theme](../generic-ui-utilities/theme.md) — Uses header height and color theming to lay out the banner {kind: sync}
- [Page Link](../layout-navigation/page-link.md) — Resolves the banner's call-to-action link target {kind: sync}
- [Ctf Asset](../contentful-media/ctf-asset.md) — Displays the banner's image or background asset {kind: sync}
