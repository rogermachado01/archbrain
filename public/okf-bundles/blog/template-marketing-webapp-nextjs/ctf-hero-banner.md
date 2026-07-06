---
type: React Component
title: Ctf Hero Banner
description: The `ctf-hero-banner` component renders a hero banner section for the marketing webapp template, likely used as a prominent introductory block on pages built with Contentful-driven content. It relies on generated GraphQL fragment types to type its incoming content fields, ensuring the banner data (as defined by `HeroBannerFieldsFragment`) is strongly typed when passed in from Contentful.
level: component
owner: contentful/team-workflows
---

The `ctf-hero-banner` component renders a hero banner section for the marketing webapp template, likely used as a prominent introductory block on pages built with Contentful-driven content. It relies on generated GraphQL fragment types to type its incoming content fields, ensuring the banner data (as defined by `HeroBannerFieldsFragment`) is strongly typed when passed in from Contentful.

For rendering rich text content within the banner, it delegates to the `CtfRichtext` component, suggesting the hero banner supports formatted text such as headlines or descriptions authored in Contentful's rich text editor. It also draws on shared theme utilities and constants — including color palette configuration and header height values — to style the banner consistently with the rest of the site, likely accounting for layout spacing relative to the site header.

# Relations

- [Ctf Hero Banner.Generated](ctf-hero-banner.generated.md) — Types the banner's Contentful content fields {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within the banner {kind: sync}
- [Theme](theme.md) — Applies shared theme colors and header spacing {kind: sync}
