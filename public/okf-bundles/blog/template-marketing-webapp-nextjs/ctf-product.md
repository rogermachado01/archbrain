---
type: React Component
title: Ctf Product
description: CtfProduct is a React component responsible for rendering a product entry sourced from Contentful within the marketing webapp template. It relies on a generated fragment type, ProductFieldsFragment, to type the shape of the product data it receives, ensuring the component works with the fields defined by the corresponding GraphQL fragment.
level: component
owner: contentful/team-workflows
---

CtfProduct is a React component responsible for rendering a product entry sourced from Contentful within the marketing webapp template. It relies on a generated fragment type, ProductFieldsFragment, to type the shape of the product data it receives, ensuring the component works with the fields defined by the corresponding GraphQL fragment.

To build out the visual presentation of a product, CtfProduct composes two other Contentful-aware components: CtfAsset, likely used to render product imagery or other media assets, and CtfRichtext, used to render formatted text content such as product descriptions. By delegating asset and rich text rendering to these specialized components, CtfProduct acts as a composition point that assembles a complete product view from smaller, reusable building blocks.

# Relations

- [Ctf Product.Generated](ctf-product.generated.md) — Types the product data using the generated fragment {kind: sync}
- [Ctf Asset](ctf-asset.md) — Renders the product's media asset {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the product's rich text content {kind: sync}
