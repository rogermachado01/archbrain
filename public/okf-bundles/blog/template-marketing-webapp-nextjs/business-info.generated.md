---
type: React Component
title: Business Info.Generated
description: This is a generated GraphQL artifact for the `business-info` component, part of the Next.js marketing web app template's Contentful-driven content model. As an auto-generated `.generated` file, it holds the TypeScript types and/or fragment definitions produced from GraphQL codegen, supporting the rendering of business-info content pulled from Contentful.
level: component
owner: contentful/team-workflows
---

This is a generated GraphQL artifact for the `business-info` component, part of the Next.js marketing web app template's Contentful-driven content model. As an auto-generated `.generated` file, it holds the TypeScript types and/or fragment definitions produced from GraphQL codegen, supporting the rendering of business-info content pulled from Contentful.

It draws on shared fragment definitions to assemble its data shape: it pulls in `AssetFieldsFragment` for representing Contentful asset data (such as images) that may be associated with a business-info entry, and it pulls in the broader `ComponentReferenceFields` fragment family from the shared fragments library, which models references to many other content types across the site (CTAs, duplex layouts, hero banners, info blocks, product tables, quotes, text blocks, menus, pages, SEO data, and other topic entities including business info itself, person, product, and product feature topics). This positions business-info as a node that can participate in the same interconnected content-reference graph as these other component types.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes asset fields for business-info media {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Shares component reference fragment for cross-content linking {kind: sync}
