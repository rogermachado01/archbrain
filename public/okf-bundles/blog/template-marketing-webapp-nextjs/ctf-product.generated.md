---
type: React Component
title: Ctf Product.Generated
description: This is a generated GraphQL artifact for the `ctf-product` component, providing the typed fragments and fragment documents needed to query and render Contentful "Product" content in the marketing web app template. Rather than defining component markup directly, this file supplies the generated TypeScript types and GraphQL document nodes that a corresponding React component consumes to fetch and type its Contentful data.
level: component
owner: contentful/team-workflows
---

This is a generated GraphQL artifact for the `ctf-product` component, providing the typed fragments and fragment documents needed to query and render Contentful "Product" content in the marketing web app template. Rather than defining component markup directly, this file supplies the generated TypeScript types and GraphQL document nodes that a corresponding React component consumes to fetch and type its Contentful data.

The generated code depends on two related generated fragment modules: one for assets and one for product features. It imports `AssetFieldsFragment` and its accompanying document from the `ctf-asset` generated module, allowing product data (such as images) to be typed and queried consistently with other components that use asset fields. It similarly imports `ProductFeatureFieldsFragment` and its document from the `ctf-product-feature` generated module, enabling the product query to include structured feature data as part of its shape. Together these imports let the product component compose its own GraphQL fragment out of shared, reusable field-selection fragments.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes asset fields (e.g. product images) via the shared asset fragment {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Includes product feature fields via the shared product-feature fragment {kind: sync}
