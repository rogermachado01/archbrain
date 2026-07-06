---
type: React Component
title: Ctf Business Info Gql
description: CtfBusinessInfoGql is a React component that fetches and displays business information sourced from Contentful. It relies on a generated GraphQL hook to retrieve the business info entry, and it uses the Contentful context to determine how that data should be resolved or previewed within the current app environment.
level: component
owner: contentful/team-workflows
---

CtfBusinessInfoGql is a React component that fetches and displays business information sourced from Contentful. It relies on a generated GraphQL hook to retrieve the business info entry, and it uses the Contentful context to determine how that data should be resolved or previewed within the current app environment.

When the requested business info entry cannot be found, the component falls back to rendering the EntryNotFound component, ensuring that missing or unpublished content is handled gracefully rather than breaking the page. Together, these pieces let the component act as a self-contained data-fetching wrapper: it queries for the entry, reacts to contextual settings from Contentful, and degrades cleanly when no matching entry exists.

# Relations

- [Business Info.Generated](business-info.generated.md) — Fetches business info data via generated query hook {kind: sync}
- [Entry Not Found](entry-not-found.md) — Falls back to not-found state when entry is missing {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful environment/context for data resolution {kind: sync}
