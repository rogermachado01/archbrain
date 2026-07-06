---
type: React Component
title: Ctf Text Block
description: `ctf-text-block` is a React component that renders a text-based content block within the marketing webapp template, likely sourced from Contentful entries. It relies on generated typing information for its Contentful fields, ensuring the shape of the incoming data—such as text content and styling options—is known at compile time. To actually display formatted body copy, it delegates rendering of rich text content to the `CtfRichtext` component, keeping the text-block component focused on layout and configuration rather than parsing rich text structures itself.
level: component
owner: contentful/team-workflows
---

`ctf-text-block` is a React component that renders a text-based content block within the marketing webapp template, likely sourced from Contentful entries. It relies on generated typing information for its Contentful fields, ensuring the shape of the incoming data—such as text content and styling options—is known at compile time. To actually display formatted body copy, it delegates rendering of rich text content to the `CtfRichtext` component, keeping the text-block component focused on layout and configuration rather than parsing rich text structures itself.

Beyond just displaying text, the component also draws on the shared theme utilities to resolve color settings, allowing the block to be styled consistently according to a selected color palette. This suggests the component supports some notion of a background or accent color that content editors can configure, which is then translated into concrete style values through the theme helper.

# Relations

- [Ctf Text Block.Generated](ctf-text-block.generated.md) — Supplies typed field data for the text block {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](theme.md) — Resolves the block's color palette into theme styles {kind: sync}
