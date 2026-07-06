---
type: React Component
title: Ctf Product Table.Generated
description: This is a generated GraphQL artifact for the ctf-product-table component, defined in the template-marketing-webapp-nextjs template. As a `.generated` module, it holds TypeScript types and document nodes produced from GraphQL codegen, rather than hand-written logic, giving the component strongly typed access to the data shapes it depends on when rendering a table of products.
level: component
owner: contentful/team-workflows
---

This is a generated GraphQL artifact for the ctf-product-table component, defined in the template-marketing-webapp-nextjs template. As a `.generated` module, it holds TypeScript types and document nodes produced from GraphQL codegen, rather than hand-written logic, giving the component strongly typed access to the data shapes it depends on when rendering a table of products.

Its type definitions are assembled from fragments belonging to three related content types. It imports product field types and their document definition from the ctf-product generated module, asset field types and document definition from the ctf-asset generated module, and product feature field types and document definition from the ctf-product-feature generated module. Together these imports let the product table compose a complete view of each product row, including associated media assets and listed product features, without redefining those shapes locally.

# Relations

- [Ctf Product.Generated](ctf-product.generated.md) — Pulls in product data fields for each table row {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Pulls in asset data for product images shown in the table {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Pulls in product feature data listed per product row {kind: sync}
