---
type: React Component
title: Ctf Text Block.Generated
description: ctf-text-block.generated is a generated GraphQL support module for the CtfTextBlock React component in the Next.js marketing web app template. It exists to pull in the typed fragments needed to render a text block whose content can include embedded assets and references to other components. Rather than defining new fields itself, it wires together generated fragment types and their corresponding document nodes from shared library modules, so the component can type-check and query nested data correctly.
level: component
owner: contentful/team-workflows
---

ctf-text-block.generated is a generated GraphQL support module for the CtfTextBlock React component in the Next.js marketing web app template. It exists to pull in the typed fragments needed to render a text block whose content can include embedded assets and references to other components. Rather than defining new fields itself, it wires together generated fragment types and their corresponding document nodes from shared library modules, so the component can type-check and query nested data correctly.

Specifically, it draws on the shared component map to resolve any embedded component references a text block might contain — such as CTAs, duplex layouts, hero banners, info blocks, product tables, quotes, other text blocks, footer/navigation menus, pages, SEO data, and topic entities — and it draws on the asset fragment module to type-check embedded media (e.g., inline images) within the text block content. Together these imports let the text block component safely traverse and render rich, nested content structures.

# Relations

- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Resolves embedded component reference types for rendering nested content {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Types embedded asset/media fields within the text block {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Supplies the GraphQL document for resolving embedded component references {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Supplies the GraphQL document for resolving embedded asset fields {kind: sync}
