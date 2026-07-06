---
type: React Component
title: Ctf Text Block.Generated
description: `ctf-text-block.generated` is a generated module supporting the React Component that renders the text block content type within the Next.js marketing template. As a generated artifact, it wires together the typed data dependencies needed to display text block content pulled from Contentful, relying on shared fragment definitions rather than defining its own data shapes from scratch.
level: component
owner: contentful/team-workflows
---

`ctf-text-block.generated` is a generated module supporting the React Component that renders the text block content type within the Next.js marketing template. As a generated artifact, it wires together the typed data dependencies needed to display text block content pulled from Contentful, relying on shared fragment definitions rather than defining its own data shapes from scratch.

It draws on the component reference map to resolve any nested or linked components that may appear within a text block's rich content, allowing the block to correctly render references to other content types such as CTAs, quotes, or info blocks. It also depends on asset field definitions to handle any media assets embedded within the text block, ensuring images or files referenced in the content are typed and available for rendering.

# Relations

- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Resolves linked components embedded in rich text content {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Supplies typed asset fields for embedded media {kind: sync}
