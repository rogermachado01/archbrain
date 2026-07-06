---
type: React Component
title: Ctf Info Block Gql
description: `ctf-info-block-gql` is a GraphQL-connected wrapper component for the info block feature in the Next.js marketing template. Rather than accepting content as plain props, it fetches its own data by way of a generated query hook, then hands the resolved data off to the presentational `CtfInfoBlock` component for rendering.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Info Block Content
ddd_role: Data Fetching Component
---

`ctf-info-block-gql` is a GraphQL-connected wrapper component for the info block feature in the Next.js marketing template. Rather than accepting content as plain props, it fetches its own data by way of a generated query hook, then hands the resolved data off to the presentational `CtfInfoBlock` component for rendering.

This separation keeps data-fetching concerns apart from presentation: the `-gql` variant knows how to talk to Contentful via GraphQL, while `CtfInfoBlock` focuses purely on displaying the info block's content. This pattern lets the same presentational component be reused in contexts where data is supplied differently, while `ctf-info-block-gql` serves as the entry point used wherever an info block needs to be sourced live from the CMS.

# Relations

- [Ctf Info Block.Generated](ctf-info-block.generated.md) — Fetches info block content via the generated query hook {kind: sync}
- [Ctf Info Block](ctf-info-block.md) — Delegates rendering to the presentational info block component {kind: sync}
