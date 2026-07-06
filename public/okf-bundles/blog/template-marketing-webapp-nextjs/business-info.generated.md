---
type: React Component
title: Business Info.Generated
description: This is a generated GraphQL artifact for the `business-info` topic component, part of the Next.js marketing template's Contentful-driven content model. As an auto-generated file, it defines the typed fragments and query/document helpers used to fetch business info content alongside its related assets and referenced components, keeping the shape of the data in sync with the underlying GraphQL schema.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Business Info Content
ddd_role: Generated Type/Fragment
---

This is a generated GraphQL artifact for the `business-info` topic component, part of the Next.js marketing template's Contentful-driven content model. As an auto-generated file, it defines the typed fragments and query/document helpers used to fetch business info content alongside its related assets and referenced components, keeping the shape of the data in sync with the underlying GraphQL schema.

It depends on the ctf-asset generated module to pull in asset field fragments, allowing business info entries to include structured references to images or files stored in Contentful. It also depends on the shared ctf-componentMap generated module, which aggregates reference field fragments across the full range of content types in the system (CTAs, duplex blocks, hero banners, info blocks, product tables, quotes, text blocks, menus, pages, SEO, and topic types including business info itself, person, product, and product feature). This allows the business-info component's generated document to resolve polymorphic component references consistently with the rest of the site's content model.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes asset fields for business info media {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Resolves referenced component types linked from business info {kind: sync}
