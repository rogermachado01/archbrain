---
type: React Component
title: Ctf Hero Banner
description: The `ctf-hero-banner` component renders the Hero Banner section for pages built with the Contentful-driven marketing template. It relies on generated GraphQL types from `HeroBannerFieldsFragment` to type the fields it receives from Contentful, ensuring the banner content it displays matches the shape defined in the CMS schema.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Hero Banner Content
ddd_role: Presentational Component
---

The `ctf-hero-banner` component renders the Hero Banner section for pages built with the Contentful-driven marketing template. It relies on generated GraphQL types from `HeroBannerFieldsFragment` to type the fields it receives from Contentful, ensuring the banner content it displays matches the shape defined in the CMS schema.

To render its body copy, the component delegates to `CtfRichtext`, the shared rich text renderer used across Contentful-backed components, allowing the hero banner to display formatted content such as paragraphs, links, or emphasis defined by editors. For layout and styling, it pulls from the shared theme module, using `getColorConfigFromPalette` to resolve color schemes consistent with the site's design system, and `HEADER_HEIGHT_MD` / `HEADER_HEIGHT` to correctly offset or size the banner relative to the fixed site header across breakpoints.

# Relations

- [Ctf Hero Banner.Generated](ctf-hero-banner.generated.md) — Types the banner's Contentful fields using generated fragment data {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the banner's rich text content {kind: sync}
- [Theme](theme.md) — Applies theme colors and header-height offsets to the banner layout {kind: sync}
