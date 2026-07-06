---
type: React Component
title: Ctf Product Table Gql
description: `ctf-product-table-gql` is a React component that acts as the data-fetching wrapper for the product table feature. Its role is to execute the generated GraphQL query for product table content and hand the resulting data off to the presentational component that renders it.
level: component
owner: contentful/team-workflows
---

`ctf-product-table-gql` is a React component that acts as the data-fetching wrapper for the product table feature. Its role is to execute the generated GraphQL query for product table content and hand the resulting data off to the presentational component that renders it.

It pulls in `useCtfProductTableQuery` from the generated GraphQL hooks module to retrieve the product table entry, then delegates rendering to `CtfProductTable`, which is responsible for laying out the actual table markup. If the query does not return a valid entry, this component falls back to `EntryNotFound` to display a standard not-found state instead of an empty or broken table.

# Relations

- [Ctf Product Table.Generated](ctf-product-table.generated.md) — Fetches product table data via generated GraphQL hook {kind: sync}
- [Ctf Product Table](ctf-product-table.md) — Passes fetched data to the product table view for rendering {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows a not-found state when no entry is returned {kind: sync}
