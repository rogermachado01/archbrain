---
type: React Component
title: Ctf Product Feature.Generated
description: ctf-product-feature.generated is a generated GraphQL artifact for the Product Feature content type in the marketing web app template, sitting under the business-info-commerce grouping alongside other commerce-related content models. As a generated file, it exists to supply typed fragments and document nodes that other components consume when fetching and rendering product feature content from Contentful.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

It depends on ctf-asset for asset field data, pulling in AssetFieldsFragment and AssetFieldsFragmentDoc so that any media associated with a product feature (such as an image illustrating the feature) can be typed and queried consistently with how assets are handled elsewhere in the app.

# Relations

- [Ctf Asset](../contentful-media/ctf-asset.md) — Reuses asset fields to type the feature's associated media {kind: sync}
