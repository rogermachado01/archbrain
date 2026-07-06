---
type: React Component
title: Ctf Richtext
description: CtfRichText renders Contentful rich text fields throughout the marketing site, handling embedded assets, embedded entries, and hyperlinks as they appear within long-form content blocks like article bodies or page sections. It resolves embedded content nodes into their appropriate React representations rather than leaving them as raw references.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Contentful Content Rendering
ddd_role: Rich Text Renderer
---

For embedded asset nodes, it delegates rendering to CtfAsset, ensuring images or files placed inline within rich text are displayed consistently with how assets appear elsewhere on the site. For embedded entries — such as components authored inline within a rich text field — it hands off rendering to ComponentResolver, which maps the entry's content type to the correct component. When rich text contains hyperlinks to internal pages, it uses PageLinkFieldsFragment data to construct proper page links rather than plain anchor tags. It also reads from the shared Contentful context, likely to access preview state or locale information needed while resolving embedded content.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders embedded assets within rich text {kind: sync}
- [Component Resolver](component-resolver.md) — Resolves embedded entries to their matching component {kind: sync}
- [Contentful Context](contentful-context.md) — Reads shared Contentful preview/locale context {kind: sync}
- [Page Link](page-link.md) — Builds internal links from embedded page references {kind: sync}
