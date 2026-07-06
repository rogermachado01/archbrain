---
type: React Component
title: Ctf Quote Gql
description: `ctf-quote-gql` is a React component that acts as the GraphQL-connected wrapper for rendering a "Quote" content type sourced from Contentful. Rather than handling the presentation itself, it is responsible for fetching the quote data and passing it along to the presentational component that knows how to render it.
level: component
owner: contentful/team-workflows
---

`ctf-quote-gql` is a React component that acts as the GraphQL-connected wrapper for rendering a "Quote" content type sourced from Contentful. Rather than handling the presentation itself, it is responsible for fetching the quote data and passing it along to the presentational component that knows how to render it.

To do this, it relies on a generated query hook, `useCtfQuoteQuery`, pulled from an auto-generated GraphQL module, which supplies the typed data-fetching logic needed to retrieve the quote entry. Once the data is retrieved, it is handed off to `CtfQuote`, the component that renders the actual markup for the quote. This separation keeps data-fetching concerns isolated from presentation, allowing `ctf-quote-gql` to serve as the integration point between Contentful's GraphQL API and the visual quote block used elsewhere in the marketing site.

# Relations

- [Ctf Quote.Generated](ctf-quote.generated.md) — Fetches quote entry data via the generated query hook {kind: sync}
- [Ctf Quote](ctf-quote.md) — Passes fetched data to the quote presentation component {kind: sync}
