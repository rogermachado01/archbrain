---
type: React Component
title: Ctf Product Table Gql
description: `ctf-product-table-gql` is a React component that acts as the data-fetching wrapper for the product table feature. It uses the generated `useCtfProductTableQuery` hook to retrieve product data via GraphQL, then hands that data off to the `CtfProductTable` presentational component for rendering.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Content
ddd_role: Data Fetching Component
---

`ctf-product-table-gql` is a React component that acts as the data-fetching wrapper for the product table feature. It uses the generated `useCtfProductTableQuery` hook to retrieve product data via GraphQL, then hands that data off to the `CtfProductTable` presentational component for rendering.

If the query does not return a valid entry, the component falls back to the `EntryNotFound` component to display an appropriate error state to the user, ensuring the UI degrades gracefully when expected content is missing from Contentful.

# Relations

- [Ctf Product Table.Generated](ctf-product-table.generated.md) — Fetches product table data via the generated GraphQL query hook {kind: sync}
- [Ctf Product Table](ctf-product-table.md) — Passes fetched product data to the table component for display {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows a not-found state when the queried entry is missing {kind: sync}
