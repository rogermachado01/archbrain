---
type: React Component
title: Ctf Business Info Gql
description: CtfBusinessInfoGql is a React component responsible for fetching and displaying business information sourced from Contentful. It relies on a generated GraphQL hook, useCtfBusinessInfoQuery, to retrieve the underlying entry data, keeping the query logic separated from the component's rendering concerns.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Business Info Content
ddd_role: Data Fetching Component
---

CtfBusinessInfoGql is a React component responsible for fetching and displaying business information sourced from Contentful. It relies on a generated GraphQL hook, useCtfBusinessInfoQuery, to retrieve the underlying entry data, keeping the query logic separated from the component's rendering concerns.

The component also integrates with the surrounding Contentful editing environment by consuming useContentfulContext, which likely supplies contextual information such as locale or preview state needed to resolve the correct entry. If the requested entry cannot be found, the component falls back to rendering EntryNotFound, ensuring a consistent error state is shown to editors or site visitors instead of a broken or empty view.

Together, these pieces let CtfBusinessInfoGql act as a self-contained data-driven component: it queries for business info, adapts to the current Contentful context, and gracefully handles the case where no matching entry exists.

# Relations

- [Business Info.Generated](business-info.generated.md) — Fetches business info data via generated GraphQL query hook {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows fallback UI when the entry is missing {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful editing/preview context to resolve the entry {kind: sync}
