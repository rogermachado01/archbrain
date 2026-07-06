---
type: React Component
title: Ctf Product Table.Generated
description: This is a generated GraphQL artifact for `ctf-product-table`, part of the Next.js marketing web app template. It defines the typed fragments and fragment document constants needed to query and assemble product table data from Contentful, pulling together the underlying pieces that make up each product row shown in the table.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Content
ddd_role: Generated Type/Fragment
---

This is a generated GraphQL artifact for `ctf-product-table`, part of the Next.js marketing web app template. It defines the typed fragments and fragment document constants needed to query and assemble product table data from Contentful, pulling together the underlying pieces that make up each product row shown in the table.

Rather than standing alone, this module composes its shape from three related generated fragments: one describing core product fields, one describing associated asset (image/media) fields, and one describing product feature fields. By importing these fragment types and their corresponding `FragmentDoc` GraphQL documents, this concept lets the product table component request a fully-typed, nested payload — product data plus its assets and features — in a single query, ensuring the table's rendering logic and its data-fetching layer stay in sync.

# Relations

- [Ctf Product.Generated](ctf-product.generated.md) — Pulls in core product data for each table row {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes product images and media assets in the table data {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Includes product feature details for each table row {kind: sync}
