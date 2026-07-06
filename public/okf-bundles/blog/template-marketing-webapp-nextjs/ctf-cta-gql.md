---
type: React Component
title: Ctf Cta Gql
description: `ctf-cta-gql` is a React component that acts as a GraphQL-connected wrapper around the CTA (call-to-action) rendering logic. Rather than accepting CTA content as plain props, it is responsible for fetching the necessary data via a generated GraphQL hook and then handing that data off to the presentational CTA component for rendering.
level: component
owner: contentful/team-workflows
---

`ctf-cta-gql` is a React component that acts as a GraphQL-connected wrapper around the CTA (call-to-action) rendering logic. Rather than accepting CTA content as plain props, it is responsible for fetching the necessary data via a generated GraphQL hook and then handing that data off to the presentational CTA component for rendering.

To do this, it relies on `useCtfCtaQuery`, a hook produced by GraphQL Code Generator, to retrieve the CTA's content from the Contentful API. Once the query resolves, this component composes with `CtfCta`, passing along the fetched data so that `CtfCta` can handle the actual visual presentation. This separation keeps data-fetching concerns isolated from rendering concerns, letting `CtfCta` remain a straightforward presentational component while `ctf-cta-gql` manages the query lifecycle.

# Relations

- [Ctf Cta.Generated](ctf-cta.generated.md) — Fetches CTA content via the generated query hook {kind: sync}
- [Ctf Cta](ctf-cta.md) — Passes fetched CTA data to the presentational CTA component {kind: sync}
