---
type: React Component
title: Ctf Product Gql
description: ctf-product-gql is a React component that acts as a data-fetching wrapper for rendering a product entry sourced from Contentful. It uses the generated useCtfProductQuery hook to retrieve the product data for a given entry, then delegates the actual presentation to the CtfProduct component once the data is available.
level: component
owner: contentful/team-workflows
---

ctf-product-gql is a React component that acts as a data-fetching wrapper for rendering a product entry sourced from Contentful. It uses the generated useCtfProductQuery hook to retrieve the product data for a given entry, then delegates the actual presentation to the CtfProduct component once the data is available.

If the query does not resolve to a valid entry, the component falls back to rendering the EntryNotFound component, providing a consistent error state for missing or unpublished content. In this way, ctf-product-gql serves as the connective layer between the GraphQL query layer and the presentational product component, handling both the happy path and the not-found case for product entries within the marketing webapp template.

# Relations

- [Ctf Product.Generated](ctf-product.generated.md) — Fetches product entry data via generated GraphQL hook {kind: sync}
- [Ctf Product](ctf-product.md) — Renders the fetched product entry {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows a not-found state when the product entry is missing {kind: sync}
