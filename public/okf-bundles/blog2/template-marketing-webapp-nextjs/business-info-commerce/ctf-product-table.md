---
type: React Component
title: Ctf Product Table
description: CtfProductTable renders a tabular listing of commerce products sourced from Contentful, pulling in product entries and their associated feature and asset data to build out the rows and columns of the comparison table. It falls back to an entry-not-found state when a referenced product entry cannot be resolved, keeping the table resilient to missing or unpublished content.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

Rich text support lets table cells or surrounding copy include formatted descriptions rather than plain strings, while the generated GraphQL fragments for products, product features, and assets supply the typed data shapes the table depends on to render prices, feature comparisons, and images consistently.

# Relations

- [Ctf Richtext](../contentful-content-blocks/ctf-richtext.md) — Renders rich text content within table cells {kind: sync}
- [Ctf Product](ctf-product.md) — Supplies product data fields for each table row {kind: sync}
- [Ctf Asset](../contentful-media/ctf-asset.md) — Supplies product images/assets for table display {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Supplies product feature data for comparison rows {kind: sync}
- [Entry Not Found](../error-handling/entry-not-found.md) — Shows fallback UI when a product entry is missing {kind: sync}
