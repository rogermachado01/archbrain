---
type: React Component
title: Ctf Product.Generated
description: This is a generated GraphQL artifact for `ctf-product`, part of the Contentful-driven marketing web app template. Rather than defining new logic itself, it re-exports typed fragment building blocks from related generated modules, allowing product-related queries to compose asset and product-feature data in a type-safe way.
level: component
owner: contentful/team-workflows
---

This is a generated GraphQL artifact for `ctf-product`, part of the Contentful-driven marketing web app template. Rather than defining new logic itself, it re-exports typed fragment building blocks from related generated modules, allowing product-related queries to compose asset and product-feature data in a type-safe way.

Specifically, it imports the `AssetFieldsFragment` type and its corresponding `AssetFieldsFragmentDoc` document from the ctf-asset generated module, giving it access to the shape and query document for asset fields (such as images tied to a product). It also imports `ProductFeatureFieldsFragment` and `ProductFeatureFieldsFragmentDoc` from the ctf-product-feature generated module, providing the typed shape and query document for product feature data. Together, these imports let the product concept assemble a complete GraphQL fragment for products that includes both their associated assets and their feature listings, supporting downstream React components that render product details.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Pulls in asset field types for product images {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Pulls in product feature field types for feature listings {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Reuses the asset fragment document in product queries {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Reuses the product feature fragment document in product queries {kind: sync}
