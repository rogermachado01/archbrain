---
type: React Component
title: Ctf Info Block
description: "CtfInfoBlock renders a Contentful-driven content block that pairs a media asset with supporting rich text, styled according to a color palette selection. It's the kind of building block editors use to assemble marketing pages: an image or media asset on one side, formatted text on the other, with theme-aware coloring so the block fits whatever section design is active on the page."
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Blocks
ddd_role: Presentational Component
---

To achieve this composition, the component delegates asset rendering to CtfAsset rather than handling media formats itself, and hands off rich text fields to CtfRichtext for structured content rendering, keeping this component focused on layout and arrangement. It also pulls color configuration from the shared theme utilities so its background and accent colors stay consistent with the palette values authored in Contentful, rather than hardcoding styles locally.

# Relations

- [Ctf Asset](../contentful-media/ctf-asset.md) — Renders the block's media asset {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](../generic-ui-utilities/theme.md) — Resolves palette colors for the block's styling {kind: sync}
