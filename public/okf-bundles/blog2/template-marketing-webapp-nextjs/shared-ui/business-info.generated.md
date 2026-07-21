---
type: React Component
title: Business Info.Generated
description: This is a generated GraphQL type module supporting the shared `business-info` UI component, providing the typed fragment definitions needed to render business information content sourced from Contentful. It exists purely as generated code output, giving the component access to strongly-typed asset and content reference data without hand-writing the GraphQL types.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Business Info & Settings
ddd_role: Generated Data Component
---

It pulls in asset field types from the ctf-asset generated module, which lets the component correctly type any images or media associated with a business info entry, such as logos or promotional assets. It also imports the broader component reference fields map, which enumerates every content type the CMS schema can return in a reference slot (CTAs, duplex layouts, hero banners, info blocks, product tables, quotes, text blocks, menus, pages, SEO data, and topic types including TopicBusinessInfo itself). This gives the business-info component the type coverage it needs when the business info topic is embedded within a larger composed page of mixed component types.

# Relations

- [Ctf Asset](ctf-asset.md) — Types media assets (e.g. logos) attached to the business info entry {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Types the possible nested component references within business info content {kind: sync}
