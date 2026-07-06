---
type: React Component
title: Ctf Text Block Gql
description: ctf-text-block-gql is a GraphQL-oriented variant of the text block component used in this Next.js marketing template. Rather than receiving its content as pre-fetched props, this component is responsible for issuing the underlying GraphQL query needed to retrieve text block data, delegating the actual data-fetching call to a generated hook produced by the Contentful GraphQL codegen pipeline.
level: component
owner: contentful/team-workflows
---

ctf-text-block-gql is a GraphQL-oriented variant of the text block component used in this Next.js marketing template. Rather than receiving its content as pre-fetched props, this component is responsible for issuing the underlying GraphQL query needed to retrieve text block data, delegating the actual data-fetching call to a generated hook produced by the Contentful GraphQL codegen pipeline.

Once the data is retrieved via that generated hook, this concept relies on the standard CtfTextBlock component to handle the actual rendering of the text content, keeping the query logic and presentation logic separated. This composition allows the template to reuse the same visual rendering behavior across both statically fetched and dynamically queried contexts.

# Relations

- [Ctf Text Block.Generated](ctf-text-block.generated.md) — Fetches text block data via generated query hook {kind: sync}
- [Ctf Text Block](ctf-text-block.md) — Delegates rendering to the base text block component {kind: sync}
