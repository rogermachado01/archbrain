---
type: React Component
title: Ctf Product Table.Generated
description: This is a generated GraphQL artifact for the ctf-product-table component, part of the Next.js marketing web app template. It defines the typed fragment structures needed to fetch and render tabular product data pulled from Contentful, aggregating information across products, their associated assets, and their individual features.
level: component
owner: contentful/team-workflows
---

This is a generated GraphQL artifact for the ctf-product-table component, part of the Next.js marketing web app template. It defines the typed fragment structures needed to fetch and render tabular product data pulled from Contentful, aggregating information across products, their associated assets, and their individual features.

Rather than composing raw GraphQL fields by hand, this module pulls in previously generated fragment definitions from three related content types. It combines the ProductFieldsFragment for core product attributes, the AssetFieldsFragment for image or file references tied to those products, and the ProductFeatureFieldsFragment for the discrete feature entries that populate the comparison table's rows or columns. Together these imports give the product table component the typed building blocks it needs to query and display a structured comparison of products and their features.

# Relations

- [Ctf Product.Generated](ctf-product.generated.md) — Supplies core product data for each table row {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Supplies product image assets shown in the table {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Supplies feature entries compared across products {kind: sync}
