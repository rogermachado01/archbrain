---
type: React Component
title: Ctf Richtext
description: CtfRichText is a React component responsible for rendering rich text content authored in Contentful, translating the structured rich text document into React elements for display on the page. It relies on a generated GraphQL hook to resolve hyperlink data referenced within the rich text, allowing links embedded in the content to be enriched with additional information fetched from Contentful before rendering.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Richtext Rendering
ddd_role: Presentational Component
---

CtfRichText is a React component responsible for rendering rich text content authored in Contentful, translating the structured rich text document into React elements for display on the page. It relies on a generated GraphQL hook to resolve hyperlink data referenced within the rich text, allowing links embedded in the content to be enriched with additional information fetched from Contentful before rendering.

Beyond plain text and links, the component handles embedded assets and embedded entries that can appear inline within a rich text body. It uses CtfAsset to render embedded media such as images, and delegates rendering of embedded entries to the ComponentResolver, which maps entry data to the appropriate component for display. The component also reads from the Contentful context, likely to access shared preview or locale state needed to correctly resolve and render the rich text content.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders embedded media assets within rich text {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Types embedded asset data used in rich text rendering {kind: sync}
- [Ctf Richtext.Generated](ctf-richtext.generated.md) — Fetches hyperlink data for links in rich text {kind: sync}
- [Component Resolver](component-resolver.md) — Resolves embedded entries to their matching components {kind: sync}
- [Contentful Context](contentful-context.md) — Reads shared Contentful context for rendering rich text {kind: sync}
