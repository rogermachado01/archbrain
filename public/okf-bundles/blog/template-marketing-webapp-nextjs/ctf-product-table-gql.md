---
type: React Component
title: Ctf Product Table Gql
description: `ctf-product-table-gql` is the data-fetching wrapper around the `CtfProductTable` component. It calls `useCtfProductTableQuery`, a generated GraphQL hook, to retrieve the product table content from Contentful, then hands the resolved data off to `CtfProductTable` for rendering.
level: component
owner: contentful/team-workflows
---

`ctf-product-table-gql` is the data-fetching wrapper around the `CtfProductTable` component. It calls `useCtfProductTableQuery`, a generated GraphQL hook, to retrieve the product table content from Contentful, then hands the resolved data off to `CtfProductTable` for rendering.

If the query does not return a matching entry, the component falls back to `EntryNotFound`, the shared error-state component used across the app's feature components to signal missing Contentful content to the user.

# Relations

- [Ctf Product Table.Generated](ctf-product-table.generated.md) — Fetches product table data via generated GraphQL hook {kind: sync}
- [Ctf Product Table](ctf-product-table.md) — Passes fetched data to the product table view {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows a not-found state when no entry is returned {kind: sync}
