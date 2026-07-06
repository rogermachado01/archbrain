---
type: React Component
title: Ctf Duplex Gql
description: `ctf-duplex-gql` is a React component that acts as the GraphQL-connected wrapper for the duplex content block in this Next.js marketing template. Rather than rendering markup directly, it is responsible for fetching the data needed to display a duplex module and passing it along to the presentational component that handles the actual layout.
level: component
owner: contentful/team-workflows
---

`ctf-duplex-gql` is a React component that acts as the GraphQL-connected wrapper for the duplex content block in this Next.js marketing template. Rather than rendering markup directly, it is responsible for fetching the data needed to display a duplex module and passing it along to the presentational component that handles the actual layout.

To do this, it relies on a generated hook, `useCtfDuplexQuery`, pulled in from the corresponding generated GraphQL artifacts, which supplies the typed data for the query. Once the data is retrieved, it is handed off to `CtfDuplex`, the presentational component that renders the duplex section using that data. This separation keeps data-fetching concerns isolated from rendering concerns, following a common pattern in this template where a `-gql` component pairs a generated query hook with its corresponding UI component.

# Relations

- [Ctf Duplex.Generated](ctf-duplex.generated.md) — Fetches duplex content data via the generated query hook {kind: sync}
- [Ctf Duplex](ctf-duplex.md) — Passes fetched data to the duplex presentational component for rendering {kind: sync}
