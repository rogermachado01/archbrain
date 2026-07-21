---
type: React Component
title: Business Info.Generated
description: This is a generated GraphQL artifact backing the business-info-commerce module, providing the typed data layer for a topic-business-info content block sourced from Contentful. It is not authored directly but produced by codegen from a corresponding query/fragment definition, and it exists to give the business-info-commerce components strongly typed access to the fields fetched for that content type.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

It pulls in the asset fragment types from ctf-asset so that any image or file fields associated with the business info entry (such as logos or media assets) are typed consistently with how assets are handled elsewhere in the content model. It also depends on the shared component-reference fragment map, which aggregates the fragment types for every content block variant (CTA, duplex, hero banner, info block, product table, quote, text block, footer/navigation menus, pages, SEO, and other topic types). This lets business-info.generated correctly type any embedded or referenced content blocks that a business info entry may link to, keeping it consistent with the rest of the Contentful-driven rendering pipeline.

# Relations

- [Ctf Asset](../contentful-media/ctf-asset.md) — Types media assets attached to the business info entry {kind: sync}
- [Ctf ComponentMap.Generated](../contentful-content-blocks/ctf-componentMap.generated.md) — Types any referenced content blocks embedded in the business info entry {kind: sync}
