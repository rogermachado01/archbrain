---
type: React Component
title: Ctf Richtext
description: CtfRichText renders Contentful rich-text fields into React elements, handling embedded assets and embedded entries alongside inline text formatting within marketing pages built from this template. It sits inside the contentful-content-blocks group, acting as the renderer invoked whenever a content block's field is a rich-text document rather than a plain string.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Text Content Blocks
ddd_role: Rich Text Renderer
---

To render embedded media inline, it delegates to CtfAsset for asset rendering, and to ComponentResolver for embedded entries, letting arbitrary content blocks appear mid-document without CtfRichText needing to know their concrete types. It reads shared Contentful preview/locale state via useContentfulContext so embedded content resolves consistently with the surrounding page, and it consumes page-link fragment data to render internal links embedded within the rich text as proper page links rather than raw hrefs.

# Relations

- [Ctf Asset](../contentful-media/ctf-asset.md) — Renders embedded assets inline within rich text {kind: sync}
- [Component Resolver](component-resolver.md) — Delegates embedded entries to the generic component resolver {kind: sync}
- [Contentful Context](../generic-ui-utilities/contentful-context.md) — Reads shared Contentful preview/locale context for rendering {kind: sync}
- [Page Link](../layout-navigation/page-link.md) — Resolves embedded internal links using page-link data {kind: sync}
