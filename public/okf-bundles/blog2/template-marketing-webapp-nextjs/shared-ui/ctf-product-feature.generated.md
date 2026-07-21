---
type: React Component
title: Ctf Product Feature.Generated
description: ctf-product-feature.generated is a generated GraphQL artifact backing the ProductFeature component in the shared-ui layer of the Next.js marketing template. It exists to type and wire up the query fragments this component depends on, keeping the hand-written component code decoupled from the raw GraphQL schema.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Catalog
ddd_role: Generated Data Component
---

Its one known dependency pulls in AssetFieldsFragment and AssetFieldsFragmentDoc from the ctf-asset generated module, meaning a product feature entry can carry an associated media asset (such as an image) whose shape is defined and validated by the shared asset fragment rather than being redefined locally.

# Relations

- [Ctf Asset](ctf-asset.md) — Reuses the shared asset fragment to type the feature's media asset {kind: sync}
