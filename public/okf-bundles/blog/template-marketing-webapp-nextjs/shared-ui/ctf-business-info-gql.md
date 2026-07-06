---
type: React Component
title: Ctf Business Info Gql
description: CtfBusinessInfoGql is a React component in the shared-ui layer that resolves and renders business information sourced from Contentful via GraphQL. It fetches its data through the generated `useCtfBusinessInfoQuery` hook, coordinating with the surrounding Contentful preview/editing context to determine how the query should behave, and falls back to an EntryNotFound state when the underlying Contentful entry can't be resolved.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Business Info & Settings
ddd_role: Data Fetching Component
---

Because it draws on `useContentfulContext`, the component is aware of whether it's rendering in a live preview or editing mode versus a standard published view, which affects how it queries and displays the business info entry. This makes it a data-fetching wrapper rather than a pure presentational component: its main job is bridging the generated GraphQL query with graceful error handling for missing content.

# Relations

- [Business Info.Generated](business-info.generated.md) — Fetches business info data via generated GraphQL hook {kind: sync}
- [Entry Not Found](entry-not-found.md) — Falls back to not-found UI when the entry is missing {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful preview/editing state to drive the query {kind: sync}
