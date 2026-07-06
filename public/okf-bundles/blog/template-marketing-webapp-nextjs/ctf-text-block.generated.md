---
type: React Component
title: Ctf Text Block.Generated
description: `ctf-text-block.generated` is a generated TypeScript module supporting the React component responsible for rendering a text block section within the marketing web app template built on Contentful. As a generated artifact, it pulls in type and fragment definitions needed to correctly type the data this component consumes, rather than containing hand-written rendering logic itself.
level: component
owner: contentful/team-workflows
---

`ctf-text-block.generated` is a generated TypeScript module supporting the React component responsible for rendering a text block section within the marketing web app template built on Contentful. As a generated artifact, it pulls in type and fragment definitions needed to correctly type the data this component consumes, rather than containing hand-written rendering logic itself.

It depends on the shared component map fragments, which define the broad set of possible referenced content types (CTAs, duplex sections, hero banners, info blocks, product tables, quotes, text blocks, footer/navigation menus, pages, SEO fields, and topic-related fragments) that can appear as component references within the CMS content model. It also depends on generated asset field types, allowing the text block component to properly type any associated media assets, such as images embedded alongside or within the text content.

# Relations

- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Resolves referenced component types for embedded content {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Types asset fields for media used in the text block {kind: sync}
