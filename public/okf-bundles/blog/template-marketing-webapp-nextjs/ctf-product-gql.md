---
type: React Component
title: Ctf Product Gql
description: `ctf-product-gql` is a React component that acts as a GraphQL-connected wrapper around the product entry rendering logic. It calls `useCtfProductQuery`, a generated hook, to fetch product data from Contentful, and passes the result along to the `CtfProduct` component for actual presentation. If the query does not resolve to a valid entry, it falls back to rendering the `EntryNotFound` component, giving users a graceful error state instead of a broken page.
level: component
owner: contentful/team-workflows
---

`ctf-product-gql` is a React component that acts as a GraphQL-connected wrapper around the product entry rendering logic. It calls `useCtfProductQuery`, a generated hook, to fetch product data from Contentful, and passes the result along to the `CtfProduct` component for actual presentation. If the query does not resolve to a valid entry, it falls back to rendering the `EntryNotFound` component, giving users a graceful error state instead of a broken page.

In practice, this component sits between the data-fetching layer and the display layer for product content: it handles the query execution and conditional branching, while delegating the visual rendering of a found product to `CtfProduct` and the handling of a missing product to `EntryNotFound`.

# Relations

- [Ctf Product.Generated](ctf-product.generated.md) — Fetches product data via the generated query hook {kind: sync}
- [Ctf Product](ctf-product.md) — Renders the resolved product entry {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows a not-found state when the product is missing {kind: sync}
