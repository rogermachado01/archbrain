---
type: React Component
title: Ctf Richtext
description: CtfRichtext renders Contentful rich text fields as React content, resolving embedded assets, entries, and links inline as it walks the document structure. It sits in the shared-ui layer alongside other Contentful field renderers, giving any page or component a consistent way to display formatted copy without each caller needing to handle Contentful's rich text node types itself.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Rich Content Rendering
ddd_role: Presentational Component
---

Within a rich text document, embedded media nodes are handed off to CtfAsset for rendering, while embedded entry nodes are routed through ComponentResolver so arbitrary content blocks can appear mid-copy. Hyperlink nodes that reference internal pages resolve via PageLinkFieldsFragment data to produce proper in-app links rather than raw URLs. The component also reads from ContentfulContext, letting it adapt rendering behavior (such as locale or preview state) to the surrounding page's Contentful context.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders embedded assets within rich text {kind: sync}
- [Component Resolver](component-resolver.md) — Resolves embedded entries into components {kind: sync}
- [Contentful Context](contentful-context.md) — Reads locale/preview context for rendering {kind: sync}
- [Page Link](page-link.md) — Resolves internal page links in hyperlinks {kind: sync}
