---
type: React Component
title: Ctf Text Block Gql
description: `ctf-text-block-gql` is a GraphQL query module associated with the text block feature in this Next.js marketing template. It defines or exposes `useCtfTextBlockQuery`, a generated hook used to fetch text block content, likely sourced from Contentful given the `ctf` prefix convention used throughout this template.
level: component
owner: contentful/team-workflows
---

`ctf-text-block-gql` is a GraphQL query module associated with the text block feature in this Next.js marketing template. It defines or exposes `useCtfTextBlockQuery`, a generated hook used to fetch text block content, likely sourced from Contentful given the `ctf` prefix convention used throughout this template.

This module works together with the `ctf-text-block` component, which imports the rendering component `CtfTextBlock`. Together, these pieces separate data-fetching concerns from presentation: the generated query hook handles retrieving the text block data, while the component file handles displaying it. The `.generated` naming suggests this file itself is produced by a code-generation step tied to a GraphQL schema or query definition.

# Relations

- [Ctf Text Block.Generated](ctf-text-block.generated.md) — Provides the generated query hook used to fetch text block data {kind: sync}
- [Ctf Text Block](ctf-text-block.md) — Supplies the component that renders the fetched text block content {kind: sync}
