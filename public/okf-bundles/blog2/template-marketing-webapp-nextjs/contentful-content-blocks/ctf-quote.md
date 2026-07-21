---
type: React Component
title: Ctf Quote
description: CtfQuote renders a Contentful-authored quote block within the marketing site's page content, pulling in its typed fields from the generated ComponentQuote fragment map and delegating rendering of the quote's rich text body and any associated image asset to dedicated sub-components.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Text Content Blocks
ddd_role: Presentational Component
---

The component relies on the generated Contentful component map to know the shape of its fields, including references to other content types that can appear alongside it in a page (CTAs, duplex blocks, hero banners, info blocks, product tables, text blocks, and topic/person/product entries), even though ctf-quote itself only consumes the quote-specific fragment from that map. It also draws on the shared asset-fields fragment to resolve any image tied to the quote, and applies theme-driven color configuration to style the block consistently with the palette used elsewhere in the app.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders the quote's rich text body {kind: sync}
- [Theme](../generic-ui-utilities/theme.md) — Applies palette-based color styling to the quote block {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Reads its typed fields from the generated Contentful component map {kind: sync}
- [Ctf Asset](../contentful-media/ctf-asset.md) — Resolves the quote's associated image asset fields {kind: sync}
