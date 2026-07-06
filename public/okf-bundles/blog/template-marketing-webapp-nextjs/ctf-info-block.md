---
type: React Component
title: Ctf Info Block
description: "`ctf-info-block` is a React component used in the marketing web app template to render an informational content block sourced from Contentful. It relies on generated GraphQL types to know the shape of its incoming data, and delegates the display of specific pieces of content to specialized components: images or media are handled by `ctf-asset`, while formatted text content is handled by `ctf-richtext`."
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Info Block Content
ddd_role: Presentational Component
---

`ctf-info-block` is a React component used in the marketing web app template to render an informational content block sourced from Contentful. It relies on generated GraphQL types to know the shape of its incoming data, and delegates the display of specific pieces of content to specialized components: images or media are handled by `ctf-asset`, while formatted text content is handled by `ctf-richtext`.

Beyond rendering content, the component also applies visual styling through the shared theme system, pulling color configuration from a palette to ensure the block's appearance is consistent with the overall design system. Together, these pieces let `ctf-info-block` compose asset display, rich text rendering, and themed styling into a single cohesive content block used across marketing pages.

# Relations

- [Ctf Info Block.Generated](ctf-info-block.generated.md) — Uses generated types to shape incoming block data {kind: sync}
- [Ctf Asset](ctf-asset.md) — Renders embedded media or images within the block {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders formatted rich text content within the block {kind: sync}
- [Theme](theme.md) — Applies palette-based color styling to the block {kind: sync}
