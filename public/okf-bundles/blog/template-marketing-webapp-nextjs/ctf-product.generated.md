---
type: React Component
title: Ctf Product.Generated
description: `ctf-product.generated` is a generated GraphQL artifact for a Product component in this Next.js marketing template, part of the Contentful (`ctf-`) content-model integration layer. It defines and exports typed fragment fields used to shape product data fetched from Contentful, and it pulls in related generated fragments so that product data can be composed alongside associated content types.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Content
ddd_role: Generated Type/Fragment
---

`ctf-product.generated` is a generated GraphQL artifact for a Product component in this Next.js marketing template, part of the Contentful (`ctf-`) content-model integration layer. It defines and exports typed fragment fields used to shape product data fetched from Contentful, and it pulls in related generated fragments so that product data can be composed alongside associated content types.

Specifically, this file depends on the asset fragment definitions from `ctf-asset.generated` and the product feature fragment definitions from `ctf-product-feature.generated`, importing both the fragment type and the fragment document object from each. This composition pattern indicates that a product entry, as modeled here, includes references to assets (such as images) and to product features, which are themselves resolved through their own generated fragment definitions elsewhere in the codebase.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes product image or media assets {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Lists the product's associated features {kind: sync}
