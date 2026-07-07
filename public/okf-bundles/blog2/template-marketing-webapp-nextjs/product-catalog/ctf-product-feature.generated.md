---
type: React Component
icon: fe-component.svg
title: Ctf Product Feature.Generated
description: ctf-product-feature.generated is a generated GraphQL artifact backing the ProductFeature component in the shared-ui layer of this Contentful-driven marketing site template. It exists to type and wire the data contract for product feature blocks, pulling in fragment definitions rather than duplicating asset-shape logic locally.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_role: Generated Data Component
---

Its only known dependency is on the ctf-asset generated module, from which it imports AssetFieldsFragment and AssetFieldsFragmentDoc. This tells us that a product feature entry includes at least one associated media asset (e.g., an icon or illustration accompanying the feature copy), and that this component relies on the shared asset fragment to fetch and type that asset consistently with how other components request asset data.

# Relations

- [Ctf Asset](../content-media/ctf-asset.md) — Reuses the shared asset fragment to fetch the feature's image/icon data {kind: sync}
