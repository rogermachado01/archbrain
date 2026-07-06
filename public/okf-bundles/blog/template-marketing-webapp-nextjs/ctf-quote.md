---
type: React Component
title: Ctf Quote
description: CtfQuote is a React component from the Next.js marketing web app template that renders a quote block sourced from Contentful. It relies on a generated GraphQL fragment type to type its incoming quote data, ensuring the shape of the content matches what the component expects to render.
level: component
owner: contentful/team-workflows
---

CtfQuote is a React component from the Next.js marketing web app template that renders a quote block sourced from Contentful. It relies on a generated GraphQL fragment type to type its incoming quote data, ensuring the shape of the content matches what the component expects to render.

To display the quote's textual content, the component delegates rendering to CtfRichtext, which handles Contentful's rich text format. It also draws on shared theming utilities to resolve color configuration from a given palette, allowing the quote's visual style to align with the overall design system used across the template.

# Relations

- [Ctf Quote.Generated](ctf-quote.generated.md) — Types the quote data using the generated fragment {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the quote's rich text content {kind: sync}
- [Theme](theme.md) — Resolves color styling from the theme palette {kind: sync}
