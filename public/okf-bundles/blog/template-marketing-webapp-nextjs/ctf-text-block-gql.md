---
type: React Component
title: Ctf Text Block Gql
description: `ctf-text-block-gql` is a GraphQL-related module supporting the `ctf-text-block` component within the Next.js marketing web app template. It works together with a generated query file, `ctf-text-block.generated`, from which it consumes `useCtfTextBlockQuery`, a hook produced by the code generation pipeline for fetching text block content from Contentful.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Text Block Content
ddd_role: Data Fetching Component
---

`ctf-text-block-gql` is a GraphQL-related module supporting the `ctf-text-block` component within the Next.js marketing web app template. It works together with a generated query file, `ctf-text-block.generated`, from which it consumes `useCtfTextBlockQuery`, a hook produced by the code generation pipeline for fetching text block content from Contentful.

This concept sits between the generated GraphQL layer and the presentational `CtfTextBlock` component, wiring the fetched query data into the component that actually renders the text block on the page. In practice, it acts as the connective piece that lets the visual component stay focused on rendering while the query logic and data fetching are handled separately through the generated hook.

# Relations

- [Ctf Text Block.Generated](ctf-text-block.generated.md) — Uses generated hook to fetch text block query data {kind: sync}
- [Ctf Text Block](ctf-text-block.md) — Supplies fetched data to render the text block component {kind: sync}
