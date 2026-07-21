---
type: React Component
title: Ctf Product Table
description: CtfProductTable is a React component in the shared UI layer that renders a comparison table of products sourced from Contentful, laying out product entries alongside their features and media so visitors can compare offerings side by side. It leans on generated GraphQL fragment types to type the product, asset, and product-feature data it receives, keeping the table's rendering logic decoupled from the query definitions themselves.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Catalog
ddd_role: Presentational Component
---

Within the table, rich text fields (such as product descriptions or feature notes) are delegated to CtfRichtext for consistent formatting, while product images or media are handled by CtfAsset. If a referenced product entry is missing or unresolved, the component falls back to EntryNotFound rather than rendering a broken row, keeping the table resilient to incomplete Contentful content.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within table cells {kind: sync}
- [Ctf Product](ctf-product.md) — Types and displays individual product entries {kind: sync}
- [Ctf Asset](ctf-asset.md) — Types and displays product images or media assets {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Types and displays product feature rows {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows a fallback when a referenced product entry is missing {kind: sync}
