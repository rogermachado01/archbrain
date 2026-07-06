---
type: React Component
title: Ctf Quote
description: CtfQuote renders a quote component sourced from Contentful, pairing quoted text with attribution styling drawn from the shared theme palette. It's part of the ctf-components family invoked wherever a page's component map resolves a Quote entry, letting editors insert testimonial-style content blocks into marketing pages without custom markup.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Content Blocks
ddd_role: Presentational Component
---

To render its content, CtfQuote delegates the rich text body to CtfRichtext, so any embedded formatting, links, or references within the quote follow the same rendering rules as elsewhere in the app. It applies color styling via getColorConfigFromPalette, aligning the quote's visual treatment with the palette options an editor selects in Contentful. The component also depends on generated GraphQL fragment types for component references and for associated assets (such as an attributed image), tying its TypeScript props directly to the shape of data returned by Contentful queries.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders the quote's rich text body {kind: sync}
- [Theme](theme.md) — Applies palette-based color styling to the quote {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Typed via the generated component reference fragment used across ctf-components {kind: sync}
- [Ctf Asset](ctf-asset.md) — Typed via the generated asset fragment for any attached image {kind: sync}
