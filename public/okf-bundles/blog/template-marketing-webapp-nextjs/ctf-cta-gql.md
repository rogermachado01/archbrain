---
type: React Component
title: Ctf Cta Gql
description: `ctf-cta-gql` is a React component that serves as the GraphQL-connected wrapper for the CTA (call-to-action) block. Its role is to fetch the data needed by the CTA component and pass it along for rendering, bridging the generated GraphQL query layer with the presentational component.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: CTA Content
ddd_role: Data Fetching Component
---

`ctf-cta-gql` is a React component that serves as the GraphQL-connected wrapper for the CTA (call-to-action) block. Its role is to fetch the data needed by the CTA component and pass it along for rendering, bridging the generated GraphQL query layer with the presentational component.

It relies on `useCtfCtaQuery`, a generated hook imported from `./__generated/ctf-cta.generated`, to retrieve the CTA content from the API. Once the data is fetched, it hands off rendering to `CtfCta`, imported from `./ctf-cta`, which handles displaying the CTA markup and styling.

# Relations

- [Ctf Cta.Generated](ctf-cta.generated.md) — Fetches CTA content via generated GraphQL query {kind: sync}
- [Ctf Cta](ctf-cta.md) — Renders the CTA using the presentational component {kind: sync}
