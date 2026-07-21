---
type: React Component
title: Page Graphql Error
description: `page-graphql-error` is a React component in the marketing webapp's shared UI layer that presents a page-level error state when a GraphQL request fails. It wraps the `GraphqlError` component to render the actual error content, acting as the page-scoped shell that surfaces GraphQL failures to the user wherever data fetching breaks down.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Error Handling
ddd_role: Presentational Component
---

By delegating to `GraphqlError`, this component keeps the page-level error handling thin and consistent, ensuring any page relying on GraphQL data can fall back to a shared, uniform error display rather than defining its own error UI.

# Relations

- [Graphql Error](graphql-error.md) — Renders the shared GraphQL error display {kind: sync}
