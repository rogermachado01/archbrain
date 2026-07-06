---
type: React Component
title: Ctf Product Table
description: ctf-product-table is a React component responsible for rendering a product table as part of the marketing web app's Contentful-driven component library. It relies on a generated type, ProductTableFieldsFragment, to shape the data it receives from Contentful, ensuring the component's props match the underlying content model for product table entries.
level: component
owner: contentful/team-workflows
---

ctf-product-table is a React component responsible for rendering a product table as part of the marketing web app's Contentful-driven component library. It relies on a generated type, ProductTableFieldsFragment, to shape the data it receives from Contentful, ensuring the component's props match the underlying content model for product table entries.

To render rich text content within the table, such as descriptions or formatted notes associated with a product, the component uses the CtfRichtext component. This allows product-related copy authored in Contentful's rich text format to be displayed consistently with the rest of the site's content rendering conventions.

# Relations

- [Ctf Product Table.Generated](ctf-product-table.generated.md) — Uses generated types to shape incoming product table data {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within the product table {kind: sync}
