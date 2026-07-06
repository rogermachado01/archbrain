---
type: React Component
title: Ctf Info Block
description: ctf-info-block is a React component that renders an informational content block, likely used within marketing pages to pair visual and textual content in a structured layout. It relies on a generated GraphQL fragment type to shape the data it receives from Contentful, ensuring the component's props align with the content model defined for info blocks.
level: component
owner: contentful/team-workflows
---

ctf-info-block is a React component that renders an informational content block, likely used within marketing pages to pair visual and textual content in a structured layout. It relies on a generated GraphQL fragment type to shape the data it receives from Contentful, ensuring the component's props align with the content model defined for info blocks.

To render its content, the component composes two other Contentful-aware components: ctf-asset for displaying media such as images, and ctf-richtext for rendering formatted text content. It also draws on the shared theme module to resolve color configuration from a palette, allowing the block's visual styling to adapt based on a specified theme or color scheme passed to it.

# Relations

- [Ctf Info Block.Generated](ctf-info-block.generated.md) — Types incoming block data from the generated fragment {kind: sync}
- [Ctf Asset](ctf-asset.md) — Displays the block's media asset {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](theme.md) — Resolves color styling from the active palette {kind: sync}
