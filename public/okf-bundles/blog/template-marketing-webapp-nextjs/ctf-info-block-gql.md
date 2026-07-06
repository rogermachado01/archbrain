---
type: React Component
title: Ctf Info Block Gql
description: `ctf-info-block-gql` is the GraphQL-connected wrapper for the info block component in the Next.js marketing web app template. Its role is to sit between the data layer and the presentational component, fetching the data an info block needs and passing it down for rendering.
level: component
owner: contentful/team-workflows
---

`ctf-info-block-gql` is the GraphQL-connected wrapper for the info block component in the Next.js marketing web app template. Its role is to sit between the data layer and the presentational component, fetching the data an info block needs and passing it down for rendering.

To do this, it relies on a generated query hook to retrieve the info block content from the CMS, and it delegates the actual visual rendering to the underlying `CtfInfoBlock` component. This separation keeps data-fetching concerns isolated from presentation, so the presentational component can remain focused purely on layout and display.

# Relations

- [Ctf Info Block.Generated](ctf-info-block.generated.md) — Fetches info block content via generated query hook {kind: sync}
- [Ctf Info Block](ctf-info-block.md) — Renders the fetched data with the info block component {kind: sync}
