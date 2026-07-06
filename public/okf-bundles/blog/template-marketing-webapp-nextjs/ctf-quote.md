---
type: React Component
title: Ctf Quote
description: CtfQuote is a React component used in the marketing web app template to render a quote block sourced from Contentful. It relies on a generated GraphQL fragment type, QuoteFieldsFragment, to type the shape of the quote content it receives, ensuring the component's props align with the underlying CMS schema.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Quote Content
ddd_role: Presentational Component
---

CtfQuote is a React component used in the marketing web app template to render a quote block sourced from Contentful. It relies on a generated GraphQL fragment type, QuoteFieldsFragment, to type the shape of the quote content it receives, ensuring the component's props align with the underlying CMS schema.

To display the quote's body text, CtfQuote delegates rendering to the CtfRichtext component, which handles formatted rich text content from Contentful. For visual styling, CtfQuote also draws on the app's theme utilities, using a helper to resolve color configuration from a named palette, allowing the quote's appearance to adapt based on a selected theme or background palette.

# Relations

- [Ctf Quote.Generated](ctf-quote.generated.md) — Types the quote's Contentful fields {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the quote's rich text body {kind: sync}
- [Theme](theme.md) — Resolves theme colors for the quote's styling {kind: sync}
