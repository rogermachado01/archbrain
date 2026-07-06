---
type: React Component
title: Page Graphql Error
description: page-graphql-error is a React component within the marketing web app template built on Next.js. It serves as a page-level component responsible for presenting error states to the user when something goes wrong within that page's context.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Error Handling
ddd_role: Presentational Component
---

page-graphql-error is a React component within the marketing web app template built on Next.js. It serves as a page-level component responsible for presenting error states to the user when something goes wrong within that page's context.

To do this, the component imports GraphqlError from the shared components directory, relying on it to render the actual error output. This keeps the error-rendering logic centralized and reusable, while page-graphql-error acts as the page-specific entry point that brings that shared error display into its own rendering flow.

# Relations

- [Graphql Error](graphql-error.md) — Displays GraphQL error feedback to the user {kind: sync}
