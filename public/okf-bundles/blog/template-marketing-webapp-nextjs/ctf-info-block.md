---
type: React Component
title: Ctf Info Block
description: "CtfInfoBlock is a React component from the Next.js marketing webapp template that renders a Contentful-driven informational content block. It relies on generated GraphQL types to know the shape of its fields, and composes other Contentful feature components to render its content: it delegates asset rendering (such as images) to CtfAsset and rich text content to CtfRichtext. It also pulls in theming utilities to translate a content-defined color palette into concrete style values, allowing editors to control the block's visual presentation from Contentful."
level: component
owner: contentful/team-workflows
---

CtfInfoBlock is a React component from the Next.js marketing webapp template that renders a Contentful-driven informational content block. It relies on generated GraphQL types to know the shape of its fields, and composes other Contentful feature components to render its content: it delegates asset rendering (such as images) to CtfAsset and rich text content to CtfRichtext. It also pulls in theming utilities to translate a content-defined color palette into concrete style values, allowing editors to control the block's visual presentation from Contentful.

In practice, this component is used as a building block within the marketing site's page composition system, where content editors assemble pages from modular Contentful blocks. CtfInfoBlock specifically handles the presentation of a titled, richly formatted piece of content paired with optional media, styled according to a selected color scheme.

# Relations

- [Ctf Info Block.Generated](ctf-info-block.generated.md) — Provides the typed field data for the info block {kind: sync}
- [Ctf Asset](ctf-asset.md) — Renders the block's associated media asset {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](theme.md) — Resolves the block's color palette into theme styles {kind: sync}
