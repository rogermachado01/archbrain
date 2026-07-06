---
type: React Component
title: Page Graphql Error
description: `page-graphql-error` is a React component that serves as a page-level view for handling GraphQL errors within the marketing webapp template built on Next.js. Its primary role is to present a dedicated error state to users when a GraphQL-related failure occurs, keeping error handling consistent with the rest of the application's shared component patterns.
level: component
owner: contentful/team-workflows
---

`page-graphql-error` is a React component that serves as a page-level view for handling GraphQL errors within the marketing webapp template built on Next.js. Its primary role is to present a dedicated error state to users when a GraphQL-related failure occurs, keeping error handling consistent with the rest of the application's shared component patterns.

To accomplish this, the component relies on the shared `GraphqlError` component, which it imports and presumably renders to display the actual error content. This keeps the page component focused on layout and page-level concerns while delegating the specifics of error presentation to the shared component.

# Relations

- [Graphql Error](graphql-error.md) — Displays the shared GraphQL error message on the page {kind: sync}
