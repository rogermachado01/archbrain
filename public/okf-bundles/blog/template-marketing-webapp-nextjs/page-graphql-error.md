---
type: React Component
title: Page Graphql Error
description: `page-graphql-error` is a React component that represents an error page within the marketing web app template built on Next.js. Its role is to present a dedicated view for handling GraphQL-related errors that occur within the application, giving users a clear page to land on when such an error condition arises.
level: component
owner: contentful/team-workflows
---

`page-graphql-error` is a React component that represents an error page within the marketing web app template built on Next.js. Its role is to present a dedicated view for handling GraphQL-related errors that occur within the application, giving users a clear page to land on when such an error condition arises.

To do this, the component relies on the shared `GraphqlError` component, importing it from the shared components directory. This composition allows `page-graphql-error` to delegate the actual rendering of error details and messaging to the shared component, keeping the page itself focused on serving as the entry point for this error state.

# Relations

- [Graphql Error](graphql-error.md) — Displays the shared GraphQL error UI on this page {kind: sync}
