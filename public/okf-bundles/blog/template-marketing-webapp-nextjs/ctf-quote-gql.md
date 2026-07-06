---
type: React Component
title: Ctf Quote Gql
description: `ctf-quote-gql` is a React component that acts as the GraphQL-connected wrapper for the quote block in this Next.js marketing template. Rather than rendering markup itself, it is responsible for fetching the quote content and handing the resolved data off to the presentational `CtfQuote` component for display.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Quote Content
ddd_role: Data Fetching Component
---

`ctf-quote-gql` is a React component that acts as the GraphQL-connected wrapper for the quote block in this Next.js marketing template. Rather than rendering markup itself, it is responsible for fetching the quote content and handing the resolved data off to the presentational `CtfQuote` component for display.

To fetch its data, the component relies on a generated query hook, `useCtfQuoteQuery`, sourced from the accompanying generated GraphQL artifact. This keeps the data-fetching logic decoupled from the presentation logic: `ctf-quote-gql` orchestrates the query and passes the result along, while `ctf-quote` focuses purely on rendering the quote UI.

# Relations

- [Ctf Quote.Generated](ctf-quote.generated.md) — Uses the generated hook to fetch quote data {kind: sync}
- [Ctf Quote](ctf-quote.md) — Passes fetched data to the quote presentation component {kind: sync}
