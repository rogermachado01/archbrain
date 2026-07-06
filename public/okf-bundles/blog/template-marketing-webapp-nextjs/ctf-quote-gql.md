---
type: React Component
title: Ctf Quote Gql
description: ctf-quote-gql is a React component that acts as a GraphQL-connected wrapper around the ctf-quote presentational component. Rather than accepting quote data directly as props, it is responsible for fetching that data using a generated query hook, then handing the result off to the component that knows how to render it.
level: component
owner: contentful/team-workflows
---

ctf-quote-gql is a React component that acts as a GraphQL-connected wrapper around the ctf-quote presentational component. Rather than accepting quote data directly as props, it is responsible for fetching that data using a generated query hook, then handing the result off to the component that knows how to render it.

In practice, this component sits between the generated GraphQL layer and the visual quote component: it calls the generated hook to retrieve the query results and passes those results into CtfQuote for display. This separation keeps data-fetching concerns isolated from presentation, so CtfQuote itself stays focused purely on rendering.

# Relations

- [Ctf Quote.Generated](ctf-quote.generated.md) — Fetches quote data via the generated query hook {kind: sync}
- [Ctf Quote](ctf-quote.md) — Passes fetched data to the quote display component {kind: sync}
