---
type: React Component
title: Ctf Text Block
description: ctf-text-block is a React component that renders a text block entry from Contentful within the marketing webapp template. It relies on generated TypeScript types to know the shape of the text block content it receives, ensuring the fields it consumes match what is defined in the Contentful content model.
level: component
owner: contentful/team-workflows
---

ctf-text-block is a React component that renders a text block entry from Contentful within the marketing webapp template. It relies on generated TypeScript types to know the shape of the text block content it receives, ensuring the fields it consumes match what is defined in the Contentful content model.

To display the actual text content, it delegates rendering of rich text to the CtfRichtext component, which handles the structured document format produced by Contentful. The component also uses a theme utility to derive color configuration from a palette, allowing the text block's appearance to adapt based on styling options defined for the entry.

# Relations

- [Ctf Text Block.Generated](ctf-text-block.generated.md) — Types the text block's Contentful fields {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](theme.md) — Resolves color styling from the theme palette {kind: sync}
