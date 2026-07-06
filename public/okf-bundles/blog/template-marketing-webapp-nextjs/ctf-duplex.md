---
type: React Component
title: Ctf Duplex
description: `ctf-duplex` is a React component used in the marketing web app template to render a two-part content layout, typically pairing an image with rich text content, as is common for "duplex" style marketing sections (e.g., image alongside descriptive copy). It relies on generated GraphQL types to know the shape of its data, and delegates the rendering of its media and text portions to dedicated sub-components rather than handling that markup itself.
level: component
owner: contentful/team-workflows
---

`ctf-duplex` is a React component used in the marketing web app template to render a two-part content layout, typically pairing an image with rich text content, as is common for "duplex" style marketing sections (e.g., image alongside descriptive copy). It relies on generated GraphQL types to know the shape of its data, and delegates the rendering of its media and text portions to dedicated sub-components rather than handling that markup itself.

The component pulls in `CtfImage` to display an associated image and `CtfRichtext` to render accompanying formatted text, composing these two pieces into the duplex layout. It also uses a theme utility to derive color configuration from a palette, allowing the component's background or accent colors to be styled consistently with the broader design system depending on the palette value passed to it.

Together, these pieces let `ctf-duplex` act as a self-contained content block: it consumes typed content data, applies theme-driven coloring, and composes image and text rendering components to produce a styled, content-driven section for marketing pages.

# Relations

- [Ctf Duplex.Generated](ctf-duplex.generated.md) — Supplies the typed content data shape for the duplex block {kind: sync}
- [Ctf Image](ctf-image.md) — Renders the image half of the duplex layout {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the rich text half of the duplex layout {kind: sync}
- [Theme](theme.md) — Derives palette-based color styling for the block {kind: sync}
