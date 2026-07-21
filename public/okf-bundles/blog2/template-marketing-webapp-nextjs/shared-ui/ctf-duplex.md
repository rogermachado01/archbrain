---
type: React Component
title: Ctf Duplex
description: CtfDuplex is a React component that composes a two-sided content layout, likely pairing an image or asset with rich text and a call-to-action link, styled according to a theme palette. It sits in the shared UI layer alongside other ctf-components, drawing together several generated GraphQL fragment types to assemble its content from Contentful entries.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

The component pulls in CtfImage and CtfRichtext to render its visual and textual halves, uses theme utilities to resolve color configuration for styling, and depends on generated fragment types for both page links and assets, indicating it can render either an asset directly or reference a linked page as part of its duplex layout.

# Relations

- [Ctf Image](ctf-image.md) — Renders the image side of the duplex layout {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the rich text side of the duplex layout {kind: sync}
- [Theme](theme.md) — Resolves color styling from the theme palette {kind: sync}
- [Page Link](page-link.md) — Links through to an internal page as a call to action {kind: sync}
- [Ctf Asset](ctf-asset.md) — Supplies the asset data shown in the duplex {kind: sync}
