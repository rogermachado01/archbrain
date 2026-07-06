---
type: React Component
title: Ctf Duplex
description: `ctf-duplex` is a React component used to render a two-part content module, typically pairing an image with rich text in a side-by-side layout, as suggested by its "duplex" naming. It relies on generated GraphQL types from its companion fragment file to type the data it receives from Contentful, ensuring the shape of the content matches what the component expects.
level: component
owner: contentful/team-workflows
---

`ctf-duplex` is a React component used to render a two-part content module, typically pairing an image with rich text in a side-by-side layout, as suggested by its "duplex" naming. It relies on generated GraphQL types from its companion fragment file to type the data it receives from Contentful, ensuring the shape of the content matches what the component expects.

To build its visual output, the component composes two other feature components: `ctf-image` for displaying the associated image asset, and `ctf-richtext` for rendering the formatted text content. It also draws on the shared theme utilities to derive color styling from a defined palette, allowing the duplex block to adapt its appearance based on a color configuration passed in as content data, such as background or accent colors tied to a design system.

# Relations

- [Ctf Duplex.Generated](ctf-duplex.generated.md) — Types the component's Contentful data using the generated duplex fragment {kind: sync}
- [Ctf Image](ctf-image.md) — Renders the accompanying image within the duplex layout {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the rich text content within the duplex layout {kind: sync}
- [Theme](theme.md) — Derives color styling from the shared theme palette {kind: sync}
