---
type: React Component
title: Page Graphql Error
description: PageGraphqlError is a React component in the marketing webapp's shared UI layer that provides a page-level wrapper for surfacing GraphQL errors to the user. It composes the lower-level GraphqlError component, adapting it for use at the page scope rather than embedding it within a smaller UI fragment.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Error Handling
ddd_role: Presentational Component
---

By relying on GraphqlError for the actual error rendering, PageGraphqlError keeps its own responsibility focused on presenting failures at the whole-page level, giving developers a consistent entry point to handle GraphQL error states wherever a full page needs to communicate a failed data fetch.

# Relations

- [Graphql Error](graphql-error.md) — Renders the GraphQL error message content {kind: sync}
