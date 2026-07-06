---
type: React Component
title: Business Info.Generated
description: This is a generated GraphQL artifact for the `business-info` component, part of the marketing webapp template built on Next.js and Contentful. As a generated file, it centralizes the typed fragments and document nodes needed to query and render business info topic data consistently wherever this component is used in the app.
level: component
owner: contentful/team-workflows
---

This is a generated GraphQL artifact for the `business-info` component, part of the marketing webapp template built on Next.js and Contentful. As a generated file, it centralizes the typed fragments and document nodes needed to query and render business info topic data consistently wherever this component is used in the app.

It depends on the ctf-asset generated module to bring in asset field fragments, allowing the business info component to work with associated media such as images or files. It also depends on the shared ctf-componentMap generated module, which aggregates component reference fragments across many content types (CTAs, duplex blocks, hero banners, info blocks, product tables, quotes, text blocks, footer and navigation menus, pages, SEO, and various topic types including business info, person, product, and product feature). This shared map allows the business info component to participate in the broader content reference resolution system used throughout the site's component tree.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Pulls in asset field data for media used in business info {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Resolves component references shared across content types {kind: sync}
