---
type: React Component
title: Ctf Product Table
description: CtfProductTable is a React component that renders a comparison table of products and their features, pulling structured content from Contentful entries such as product descriptions, images, and per-product feature listings. It sits in the shared-ui layer alongside other Contentful-driven components, acting as the presentational assembly point where product data, rich text descriptions, and feature fragments are combined into a single tabular view.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Catalog
ddd_role: Presentational Component
---

The component depends on generated GraphQL fragments for products, assets, and product features to type and shape the incoming Contentful data, and it falls back to a shared error component when an expected entry cannot be resolved. It also delegates rendering of formatted text fields to a dedicated rich text component, keeping markup concerns separate from the table's layout and data-binding logic.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders rich text descriptions within table cells {kind: sync}
- [Ctf Product](ctf-product.md) — Supplies typed product data for each table row {kind: sync}
- [Ctf Asset](ctf-asset.md) — Supplies typed asset/image data for product entries {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Supplies typed feature data for product comparison rows {kind: sync}
- [Entry Not Found](entry-not-found.md) — Shows a fallback when a referenced entry is missing {kind: sync}
