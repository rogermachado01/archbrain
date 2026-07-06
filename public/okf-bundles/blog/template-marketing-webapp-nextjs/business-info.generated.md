---
type: React Component
title: Business Info.Generated
description: This is a generated GraphQL artifact for the `business-info` topic component within the Next.js marketing web app template. As a generated file, it defines the typed fragments and related document structures needed to query and render business info content sourced from Contentful, following the project's codegen conventions for typed GraphQL operations.
level: component
owner: contentful/team-workflows
---

This is a generated GraphQL artifact for the `business-info` topic component within the Next.js marketing web app template. As a generated file, it defines the typed fragments and related document structures needed to query and render business info content sourced from Contentful, following the project's codegen conventions for typed GraphQL operations.

It depends on the generated Contentful asset fragment module to bring in typed representations of asset fields, which are commonly needed to render media (such as logos or images) associated with a business info entry. It also depends on the shared component map fragment module, pulling in a broad set of typed fragments that cover the many content types the app's component reference system can resolve — including CTAs, duplex layouts, hero banners, info blocks, product tables, quotes, text blocks, menus, pages, SEO metadata, and other topic types like person, product, and product feature. This reflects that business info entries can reference or be referenced alongside a wide variety of other content components in the CMS-driven page structure. Both dependencies are imported both as fragment type definitions and as their corresponding generated GraphQL document nodes, enabling both compile-time typing and runtime query execution.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses typed asset fields when rendering associated media {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Resolves polymorphic component references linked from business info {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Executes the asset fragment document to fetch media data {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Executes the shared component reference document to fetch linked components {kind: sync}
