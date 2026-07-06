---
type: React Component
title: Ctf Info Block
description: CtfInfoBlock is a React component in the shared-ui layer that composes a Contentful-driven content block, pairing a media asset with rich text copy and applying palette-based color styling. It sits alongside other ctf-components as a reusable presentational unit for marketing pages built from Contentful entries.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Content Blocks
ddd_role: Presentational Component
---

The component delegates asset rendering to CtfAsset and text rendering to CtfRichtext, keeping its own logic focused on layout and theming rather than content parsing. It pulls color configuration from the shared theme module to derive background and text colors from a given palette value, letting content editors control visual styling through Contentful fields while the component handles the mapping to concrete style values.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders the block's media asset {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](theme.md) — Derives color styling from the selected palette {kind: sync}
