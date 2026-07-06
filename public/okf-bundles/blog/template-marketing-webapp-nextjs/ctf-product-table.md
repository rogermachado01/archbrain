---
type: React Component
title: Ctf Product Table
description: ctf-product-table is a React component that renders a product table block sourced from Contentful, using the marketing web app template's content-fetching conventions. Its shape is defined by a generated GraphQL fragment type, ProductTableFieldsFragment, which describes the fields available on the underlying Contentful content type for this component.
level: component
owner: contentful/team-workflows
---

ctf-product-table is a React component that renders a product table block sourced from Contentful, using the marketing web app template's content-fetching conventions. Its shape is defined by a generated GraphQL fragment type, ProductTableFieldsFragment, which describes the fields available on the underlying Contentful content type for this component.

To render descriptive or supplementary text within the table (such as product descriptions or notes), the component delegates to CtfRichtext, the shared rich text renderer used across the Contentful component library. This keeps rich text rendering consistent with how other Contentful-driven components display formatted content.

# Relations

- [Ctf Product Table.Generated](ctf-product-table.generated.md) — Types its props from the generated product table fragment {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within the table {kind: sync}
