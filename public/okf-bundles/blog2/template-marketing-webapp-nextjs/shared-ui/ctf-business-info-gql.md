---
type: React Component
title: Ctf Business Info Gql
description: CtfBusinessInfoGql fetches business information data from Contentful and renders it within the marketing webapp's shared UI layer, acting as the data-fetching and error-handling wrapper around a business info entry displayed to site visitors.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Business Info & Settings
ddd_role: Data Fetching Component
---

The component relies on a generated GraphQL hook to retrieve the entry, and falls back to a dedicated not-found state when the requested entry is missing from Contentful. It also draws on shared Contentful context to inform how the query or rendering behaves, tying this component into the broader preview/editing and locale-aware infrastructure used across the app's content-driven pages.

# Relations

- [Business Info.Generated](business-info.generated.md) — Fetches business info data via generated query hook {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows not-found state when entry is missing {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful context for query behavior {kind: sync}
