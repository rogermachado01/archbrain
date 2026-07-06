---
type: React Component
title: Ctf Product
description: CtfProduct is a React component that renders a product entry sourced from Contentful, part of the ctf-components family used to display CMS-driven marketing content in the Next.js template. It relies on a generated fragment type to shape the product data it receives, ensuring the component's props line up with the corresponding GraphQL query defined for products in Contentful.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Content
ddd_role: Presentational Component
---

CtfProduct is a React component that renders a product entry sourced from Contentful, part of the ctf-components family used to display CMS-driven marketing content in the Next.js template. It relies on a generated fragment type to shape the product data it receives, ensuring the component's props line up with the corresponding GraphQL query defined for products in Contentful.

To render its content, CtfProduct composes two other ctf-components: CtfAsset, which is used to display associated media such as product images, and CtfRichtext, which renders formatted long-form text fields like product descriptions. Together these dependencies let CtfProduct present a structured product view combining imagery and rich text within the broader marketing page layout.

# Relations

- [Ctf Product.Generated](ctf-product.generated.md) — Supplies the typed product data shape for the component {kind: sync}
- [Ctf Asset](ctf-asset.md) — Displays the product's associated media asset {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the product's rich text description {kind: sync}
