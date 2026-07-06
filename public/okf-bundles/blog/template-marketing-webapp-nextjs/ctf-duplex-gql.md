---
type: React Component
title: Ctf Duplex Gql
description: `ctf-duplex-gql` is a React component that acts as a GraphQL-connected wrapper for the duplex content type in this Next.js marketing template. Its role is to fetch the data a duplex block needs and then hand that data off to the presentational component responsible for actually rendering it.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Duplex Content
ddd_role: Data Fetching Component
---

`ctf-duplex-gql` is a React component that acts as a GraphQL-connected wrapper for the duplex content type in this Next.js marketing template. Its role is to fetch the data a duplex block needs and then hand that data off to the presentational component responsible for actually rendering it.

To do this, it relies on a generated hook, `useCtfDuplexQuery`, pulled from the codebase's generated GraphQL artifacts, which supplies the query logic for retrieving duplex entry data. Once the data is available, the component delegates the visual rendering to `CtfDuplex`, keeping data-fetching concerns separate from presentation.

# Relations

- [Ctf Duplex.Generated](ctf-duplex.generated.md) — Fetches duplex content via generated GraphQL query hook {kind: sync}
- [Ctf Duplex](ctf-duplex.md) — Passes fetched data to the duplex presentational component {kind: sync}
