---
type: UI Capability
title: Business Info Commerce
description: Business info and commerce topic components render Contentful-driven content blocks that surface company or product details within a page, typically as a `TopicBusinessInfo` reference embedded inside a larger content block tree. It relies on the shared component-map fragments to resolve which nested content types (CTAs, product tables, quotes, text blocks, and related topic entries like person or product) can appear alongside it, letting editors compose business-info sections from a shared library of block types.
level: container
icon: fe-design-system.svg
ddd_subdomain: core
ddd_context: Business Info Commerce
ddd_role: Business Logic Component
---

It also pulls in media assets for accompanying imagery, falls back to an entry-not-found error state when the referenced Contentful entry is missing, and reads shared Contentful context to resolve locale or preview settings needed to fetch and render the entry correctly.

# Relations

- [Contentful Media](contentful-media.md) — Renders media assets attached to the business info block {kind: sync}
- [Contentful Content Blocks](contentful-content-blocks.md) — Resolves nested content block types referenced within the topic {kind: sync}
- [Error Handling](error-handling.md) — Shows a not-found state when the entry is missing {kind: sync}
- [Generic Ui Utilities](generic-ui-utilities.md) — Reads Contentful locale/preview context for rendering {kind: sync}
