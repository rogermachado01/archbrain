---
type: React Component
title: Ctf Business Info Gql
description: CtfBusinessInfoGql is a React component responsible for fetching and rendering business information sourced from Contentful. It relies on a generated GraphQL hook to retrieve the business info entry, using the current locale and preview state supplied by the Contentful context to determine which content to query and how to render it.
level: component
owner: contentful/team-workflows
---

CtfBusinessInfoGql is a React component responsible for fetching and rendering business information sourced from Contentful. It relies on a generated GraphQL hook to retrieve the business info entry, using the current locale and preview state supplied by the Contentful context to determine which content to query and how to render it.

When the query does not return a matching entry, the component falls back to rendering the EntryNotFound component, signaling to editors or developers that the referenced content is missing or unpublished. Together, these pieces let the component act as a data-fetching wrapper that bridges Contentful content queries with the presentation layer, while gracefully handling the case of absent entries.

# Relations

- [Business Info.Generated](business-info.generated.md) — Fetches business info data via generated query hook {kind: sync}
- [Entry Not Found](entry-not-found.md) — Falls back to a not-found state when entry is missing {kind: sync}
- [Contentful Context](contentful-context.md) — Reads locale and preview settings from Contentful context {kind: sync}
