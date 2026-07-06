---
type: React Component
title: Ctf Product
description: `ctf-product` is a React component that renders a product entry sourced from Contentful, used within the marketing web app template to display product content on a page. It relies on generated typing to know the shape of the product data it receives, ensuring the component's props stay in sync with the underlying Contentful content model.
level: component
owner: contentful/team-workflows
---

`ctf-product` is a React component that renders a product entry sourced from Contentful, used within the marketing web app template to display product content on a page. It relies on generated typing to know the shape of the product data it receives, ensuring the component's props stay in sync with the underlying Contentful content model.

To render its content, `ctf-product` composes two other Contentful feature components: it uses `ctf-asset` to display associated media, such as a product image, and `ctf-richtext` to render formatted textual content, such as a product description. Together these compositions let `ctf-product` present a structured, media-rich product entry without handling asset or rich text rendering logic itself.

# Relations

- [Ctf Product.Generated](ctf-product.generated.md) — Supplies typed product fields for rendering {kind: sync}
- [Ctf Asset](ctf-asset.md) — Displays the product's associated image {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the product's rich text description {kind: sync}
