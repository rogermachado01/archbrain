---
type: React Component
title: Ctf Text Block
description: CtfTextBlock is a shared UI component that renders a text-based content block sourced from Contentful, composing rich text content with theme-driven color styling. It sits in the shared-ui layer alongside other Contentful-driven components (CTA, Duplex, HeroBanner, InfoBlock, ProductTable, Quote, and others), all of which are resolved through a generated component map that maps Contentful content types to their corresponding React components.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Content Blocks
ddd_role: Presentational Component
---

The component delegates the actual rendering of formatted body copy to CtfRichtext, while pulling color palette values from the shared theme module to style the block consistently with the design system. It also depends on generated fragment types for asset fields, indicating that the text block's Contentful schema can include an associated asset (such as an image) alongside its rich text content and color configuration.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Delegates rich text rendering to the CtfRichtext component {kind: sync}
- [Theme](theme.md) — Applies theme color palette to style the block {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Registered in the Contentful component map alongside other content-driven components {kind: sync}
- [Ctf Asset](ctf-asset.md) — Uses generated asset field types for any associated media {kind: sync}
