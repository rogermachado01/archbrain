---
type: React Component
title: Ctf Info Block Gql
description: `ctf-info-block-gql` is the GraphQL-connected wrapper for the info block component in the Next.js marketing web app template. It is responsible for fetching the data needed to render an info block and then handing that data off to the presentational `CtfInfoBlock` component for display. This separation keeps data-fetching concerns isolated from rendering logic, letting the underlying component stay focused purely on layout and markup.
level: component
owner: contentful/team-workflows
---

`ctf-info-block-gql` is the GraphQL-connected wrapper for the info block component in the Next.js marketing web app template. It is responsible for fetching the data needed to render an info block and then handing that data off to the presentational `CtfInfoBlock` component for display. This separation keeps data-fetching concerns isolated from rendering logic, letting the underlying component stay focused purely on layout and markup.

To retrieve its data, this concept relies on a generated query hook, `useCtfInfoBlockQuery`, sourced from a companion generated module. This hook encapsulates the actual GraphQL query execution, so `ctf-info-block-gql` can simply call it to obtain the content needed for the info block without managing query definitions directly. Once the query resolves, the fetched result is passed into `CtfInfoBlock` for rendering, making `ctf-info-block-gql` the integration point between Contentful-backed data and the visual info block presentation.

# Relations

- [Ctf Info Block.Generated](ctf-info-block.generated.md) — Fetches info block content via the generated query hook {kind: sync}
- [Ctf Info Block](ctf-info-block.md) — Passes fetched data to the info block for rendering {kind: sync}
