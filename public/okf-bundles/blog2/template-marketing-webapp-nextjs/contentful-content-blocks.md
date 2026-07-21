---
type: UI Capability
title: Contentful Content Blocks
description: Contentful content blocks assemble the visual building units editors compose pages from in the marketing site, pulling in imagery, styling, and internal links so a single Contentful entry can render as a fully-formed section on the page. It sits between raw Contentful data and the rendered page, translating structured content fields into concrete UI output.
level: container
icon: fe-design-system.svg
ddd_subdomain: core
ddd_context: Content Rendering
ddd_role: Content Block Renderer
---

To do this, it draws on media rendering for images and other assets, on theme utilities to resolve color palette configuration into usable styles, and on generated GraphQL fragments for page links so that references to other pages can be rendered as navigable links within a content block.

# Relations

- [Contentful Media](contentful-media.md) — Renders images and media embedded in a content block {kind: sync}
- [Generic Ui Utilities](generic-ui-utilities.md) — Resolves color palette settings for block styling {kind: sync}
- [Layout Navigation](layout-navigation.md) — Renders internal page links referenced within a content block {kind: sync}
