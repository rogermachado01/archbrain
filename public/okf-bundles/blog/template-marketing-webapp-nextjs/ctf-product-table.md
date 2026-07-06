---
type: React Component
title: Ctf Product Table
description: `ctf-product-table` is a React component that renders a product table section sourced from Contentful. It relies on a generated GraphQL fragment type, `ProductTableFieldsFragment`, to type the shape of the product table data it receives, ensuring the component's props align with the content model defined in Contentful.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Content
ddd_role: Presentational Component
---

`ctf-product-table` is a React component that renders a product table section sourced from Contentful. It relies on a generated GraphQL fragment type, `ProductTableFieldsFragment`, to type the shape of the product table data it receives, ensuring the component's props align with the content model defined in Contentful.

For rendering rich text content within the table (such as descriptions or notes associated with products), the component uses the `CtfRichtext` component, delegating the formatting and display of structured text fields to that shared building block.

# Relations

- [Ctf Product Table.Generated](ctf-product-table.generated.md) — Types the product table's incoming content data {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within the product table {kind: sync}
