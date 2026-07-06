---
type: React Component
title: Ctf Product Gql
description: `ctf-product-gql` is a React component that acts as the data-fetching layer for the product feature, sitting between the Contentful GraphQL API and the presentational `CtfProduct` component. It uses the generated `useCtfProductQuery` hook to retrieve product entry data, then decides how to render based on the result of that query.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Content
ddd_role: Data Fetching Component
---

`ctf-product-gql` is a React component that acts as the data-fetching layer for the product feature, sitting between the Contentful GraphQL API and the presentational `CtfProduct` component. It uses the generated `useCtfProductQuery` hook to retrieve product entry data, then decides how to render based on the result of that query.

When the query resolves with valid data, `ctf-product-gql` passes that data down to `CtfProduct` for rendering. When no matching entry is found, it falls back to rendering `EntryNotFound`, providing a consistent way to handle missing content across the marketing webapp template.

# Relations

- [Ctf Product.Generated](ctf-product.generated.md) — Fetches product entry data via the generated query hook {kind: sync}
- [Ctf Product](ctf-product.md) — Renders the fetched product data {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows a not-found state when the entry is missing {kind: sync}
