---
type: React Component
title: Ctf Quote.Generated
description: `ctf-quote.generated` is a generated artifact supporting the Quote component used in this Next.js marketing template. It's not a hand-written React component itself but rather generated code (likely GraphQL fragment types and related definitions) that backs the `ComponentQuote` type referenced elsewhere in the content model, such as in the component map used for rendering polymorphic content blocks from Contentful.
level: component
owner: contentful/team-workflows
---

`ctf-quote.generated` is a generated artifact supporting the Quote component used in this Next.js marketing template. It's not a hand-written React component itself but rather generated code (likely GraphQL fragment types and related definitions) that backs the `ComponentQuote` type referenced elsewhere in the content model, such as in the component map used for rendering polymorphic content blocks from Contentful.

To support its data needs, this file pulls in shared component reference fields from the central component map generated module, which defines fragments for all the various content types (CTA, Duplex, HeroBanner, InfoBlock, ProductTable, Quote, TextBlock, and others) that can appear as referenced components on a page. It also imports asset field definitions, which suggests the Quote component may include or reference an image or other media asset, such as an avatar or illustration accompanying the quoted text.

# Relations

- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Shares generated component-reference fragments used across content block types {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes generated asset fields for media referenced by the quote {kind: sync}
