---
type: React Component
title: Ctf Product.Generated
description: `ctf-product.generated` is a generated GraphQL artifact for the marketing web app's Product component, part of the Contentful (`ctf-`) integration layer used to fetch and type content for a "product" entry type. As a generated file, it centralizes the fragments and typed helpers that describe the shape of product data pulled from the CMS, so that the corresponding React component can render product entries with type-safe access to their fields.
level: component
owner: contentful/team-workflows
---

`ctf-product.generated` is a generated GraphQL artifact for the marketing web app's Product component, part of the Contentful (`ctf-`) integration layer used to fetch and type content for a "product" entry type. As a generated file, it centralizes the fragments and typed helpers that describe the shape of product data pulled from the CMS, so that the corresponding React component can render product entries with type-safe access to their fields.

This file composes its product data model out of related content fragments rather than defining everything itself. It draws in asset fields from the `ctf-asset` module, letting a product reference associated media (such as images), and it draws in product feature fields from the `ctf-product-feature` module, letting a product reference a list of feature entries. Together these imports let the generated product fragment represent a richer, nested content structure assembled from other Contentful entry types.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes product image/asset data {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Includes product feature entries {kind: sync}
