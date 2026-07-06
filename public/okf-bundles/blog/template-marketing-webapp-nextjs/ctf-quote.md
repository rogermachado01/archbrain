---
type: React Component
title: Ctf Quote
description: CtfQuote is a React component from the Next.js marketing web app template that renders a quote block sourced from Contentful. It relies on a generated GraphQL fragment type to type-check the quote data it receives, ensuring the shape of the content matches what the Contentful model provides.
level: component
owner: contentful/team-workflows
---

CtfQuote is a React component from the Next.js marketing web app template that renders a quote block sourced from Contentful. It relies on a generated GraphQL fragment type to type-check the quote data it receives, ensuring the shape of the content matches what the Contentful model provides.

To display the quote's body text with proper formatting, the component delegates rendering to CtfRichtext, which handles Contentful's rich text content. It also pulls color configuration from the shared theme utilities, allowing the quote's visual styling to adapt based on a given color palette, likely to match the background or accent scheme of the section it appears in.

# Relations

- [Ctf Quote.Generated](ctf-quote.generated.md) — Uses generated types for the quote's Contentful data {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the quote's rich text content {kind: sync}
- [Theme](theme.md) — Applies theme colors to style the quote {kind: sync}
