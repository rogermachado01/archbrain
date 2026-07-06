---
type: React Component
title: Ctf Cta Gql
description: `ctf-cta-gql` is the GraphQL-connected wrapper for the marketing site's call-to-action component. It sits between the raw generated query hook and the presentational `CtfCta` component, responsible for fetching CTA content from Contentful and passing the resulting data down as props.
level: component
owner: contentful/team-workflows
---

`ctf-cta-gql` is the GraphQL-connected wrapper for the marketing site's call-to-action component. It sits between the raw generated query hook and the presentational `CtfCta` component, responsible for fetching CTA content from Contentful and passing the resulting data down as props.

In practice, this component calls `useCtfCtaQuery` to retrieve the CTA entry, then renders `CtfCta` with the fetched data. This separation keeps data-fetching concerns isolated from presentation, so `CtfCta` itself can remain a simple, reusable UI component while `ctf-cta-gql` handles the integration with the content layer.

# Relations

- [Ctf Cta.Generated](ctf-cta.generated.md) — Fetches CTA content via the generated query hook {kind: sync}
- [Ctf Cta](ctf-cta.md) — Renders the presentational CTA component with fetched data {kind: sync}
