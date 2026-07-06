---
type: React Component
title: Ctf Text Block
description: ctf-text-block is a React component that renders a text block entry from Contentful within the marketing web app template. It relies on a generated type, TextBlockFieldsFragment, to type the shape of the Contentful data it receives, ensuring the component's props align with the underlying GraphQL query for this content type.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Text Block Content
ddd_role: Presentational Component
---

ctf-text-block is a React component that renders a text block entry from Contentful within the marketing web app template. It relies on a generated type, TextBlockFieldsFragment, to type the shape of the Contentful data it receives, ensuring the component's props align with the underlying GraphQL query for this content type.

To display the actual body content, ctf-text-block delegates rendering of rich text fields to the CtfRichtext component, keeping rich text parsing and rendering logic centralized and reusable across components. It also draws on theme utilities, specifically getColorConfigFromPalette, to resolve color configuration from a palette value, allowing the text block's appearance to adapt to design system color choices defined elsewhere in the app.

# Relations

- [Ctf Text Block.Generated](ctf-text-block.generated.md) — Types incoming Contentful text block data {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](theme.md) — Resolves color styling from the theme palette {kind: sync}
