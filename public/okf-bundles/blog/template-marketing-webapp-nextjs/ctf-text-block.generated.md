---
type: React Component
title: Ctf Text Block.Generated
description: `ctf-text-block.generated` is a generated React component module belonging to the Next.js marketing webapp template, corresponding to the "text block" content component from the Contentful-driven component system. It relies on generated GraphQL artifacts to type and resolve the data it needs to render.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Text Block Content
ddd_role: Generated Type/Fragment
---

`ctf-text-block.generated` is a generated React component module belonging to the Next.js marketing webapp template, corresponding to the "text block" content component from the Contentful-driven component system. It relies on generated GraphQL artifacts to type and resolve the data it needs to render.

It draws on the shared component map fragments to participate in the broader polymorphic component reference system, allowing a text block to be recognized and rendered alongside other referenceable component types like CTAs, duplexes, hero banners, and quotes. It also imports asset field fragments, indicating that a text block instance can include associated media assets as part of its content, sourced from the shared asset component's generated types.

# Relations

- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Registers as a selectable component type in the shared component reference map {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Fetches associated media asset fields for the text block content {kind: sync}
