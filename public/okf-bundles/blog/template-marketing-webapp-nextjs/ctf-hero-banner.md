---
type: React Component
title: Ctf Hero Banner
description: The `ctf-hero-banner` component renders the hero banner section used in the marketing web app template, most likely appearing at the top of a page as a prominent introductory element. It relies on a generated GraphQL fragment, `HeroBannerFieldsFragment`, to type or shape the content data it receives from Contentful, keeping its props aligned with the underlying content model.
level: component
owner: contentful/team-workflows
---

The `ctf-hero-banner` component renders the hero banner section used in the marketing web app template, most likely appearing at the top of a page as a prominent introductory element. It relies on a generated GraphQL fragment, `HeroBannerFieldsFragment`, to type or shape the content data it receives from Contentful, keeping its props aligned with the underlying content model.

For rendering rich text content within the banner, it delegates to the `CtfRichtext` component, suggesting the hero banner supports formatted body copy such as headings, links, or paragraphs alongside its other visual elements. It also draws on shared theme utilities and constants, including a helper for deriving color configurations from a palette and fixed header height values, which likely inform layout decisions such as spacing or offsetting content beneath a fixed-position header.

# Relations

- [Ctf Hero Banner.Generated](ctf-hero-banner.generated.md) — Provides the typed content fields for the hero banner {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within the banner {kind: sync}
- [Theme](theme.md) — Applies shared theme colors and header height offsets {kind: sync}
