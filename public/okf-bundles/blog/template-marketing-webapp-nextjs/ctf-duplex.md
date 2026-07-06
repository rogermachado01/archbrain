---
type: React Component
title: Ctf Duplex
description: "CtfDuplex is a React component used in the marketing web app template to render a two-part content layout, commonly seen in landing pages that pair an image with accompanying text in a side-by-side or split arrangement. It relies on generated GraphQL types to know the shape of its Contentful-sourced data, and delegates the actual rendering of its two halves to specialized child components: one for displaying images and one for rendering rich text content."
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Duplex Content
ddd_role: Presentational Component
---

CtfDuplex is a React component used in the marketing web app template to render a two-part content layout, commonly seen in landing pages that pair an image with accompanying text in a side-by-side or split arrangement. It relies on generated GraphQL types to know the shape of its Contentful-sourced data, and delegates the actual rendering of its two halves to specialized child components: one for displaying images and one for rendering rich text content.

To style itself consistently with the rest of the site, CtfDuplex pulls color configuration from the shared theme module, allowing the component to adapt its background or accent colors based on a palette value supplied by the content model. Together, these pieces let CtfDuplex act as a composable, content-driven building block for duplex-style sections throughout the marketing site.

# Relations

- [Ctf Duplex.Generated](ctf-duplex.generated.md) — Uses generated types to type the duplex content data {kind: sync}
- [Ctf Image](ctf-image.md) — Renders the image half of the duplex layout {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the rich text half of the duplex layout {kind: sync}
- [Theme](theme.md) — Derives theme colors for the duplex section's styling {kind: sync}
