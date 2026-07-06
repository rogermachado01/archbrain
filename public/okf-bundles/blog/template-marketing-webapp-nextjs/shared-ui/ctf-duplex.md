---
type: React Component
title: Ctf Duplex
description: CtfDuplex is a React component in the shared-ui layer used to render a two-column content block, pairing a media asset with rich text and an optional link — a common pattern for marketing pages that alternate image-and-copy sections. It renders imagery through CtfImage and long-form copy through CtfRichtext, so the actual layout composition depends on those two child components for its two "halves."
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Content Blocks
ddd_role: Presentational Component
---

The component draws its color styling from the shared theme via getColorConfigFromPalette, letting each duplex instance adopt a palette-driven background or text treatment consistent with the site's design system. It also consumes generated GraphQL fragment types from page-link and ctf-asset, indicating that the underlying content model for a duplex block includes a linked page reference and an asset, both fetched and typed via Contentful-generated fragments rather than defined ad hoc within the component.

# Relations

- [Ctf Image](ctf-image.md) — Renders the block's image via CtfImage {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text copy via CtfRichtext {kind: sync}
- [Theme](theme.md) — Applies theme palette colors to the block {kind: sync}
- [Page Link](page-link.md) — Types the block's optional page link field {kind: sync}
- [Ctf Asset](ctf-asset.md) — Types the block's associated media asset field {kind: sync}
