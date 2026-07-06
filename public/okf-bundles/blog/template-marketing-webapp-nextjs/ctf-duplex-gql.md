---
type: React Component
title: Ctf Duplex Gql
description: `ctf-duplex-gql` is a React component that acts as the GraphQL-connected wrapper for the duplex content type in this Next.js marketing template. Its role is to fetch the necessary duplex data and hand it off to the presentational component responsible for rendering it.
level: component
owner: contentful/team-workflows
---

`ctf-duplex-gql` is a React component that acts as the GraphQL-connected wrapper for the duplex content type in this Next.js marketing template. Its role is to fetch the necessary duplex data and hand it off to the presentational component responsible for rendering it.

To do this, it relies on a generated hook, `useCtfDuplexQuery`, sourced from the corresponding generated GraphQL module, which supplies the query logic and typed results. It then passes the resolved data into `CtfDuplex`, the component that handles the actual rendering of the duplex layout, keeping data-fetching and presentation concerns separate.

# Relations

- [Ctf Duplex.Generated](ctf-duplex.generated.md) — Fetches duplex content data via the generated query hook {kind: sync}
- [Ctf Duplex](ctf-duplex.md) — Passes fetched data to the duplex presentational component for rendering {kind: sync}
