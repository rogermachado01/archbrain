---
type: React Component
title: Ctf Richtext
description: CtfRichText is a React component responsible for rendering Contentful rich text fields within the marketing webapp template. It handles the rendering of embedded assets and hyperlinks that can appear inline within a rich text document, delegating asset rendering to CtfAsset and using generated query fragments to type and fetch the necessary asset data.
level: component
owner: contentful/team-workflows
---

CtfRichText is a React component responsible for rendering Contentful rich text fields within the marketing webapp template. It handles the rendering of embedded assets and hyperlinks that can appear inline within a rich text document, delegating asset rendering to CtfAsset and using generated query fragments to type and fetch the necessary asset data.

For hyperlinks within the rich text content, the component queries additional entry data via a generated hook to resolve link targets, and passes resolved embedded entries through ComponentResolver so that any nested Contentful component types can be rendered appropriately. It also reads from the surrounding Contentful context, allowing the component to adapt its rendering behavior—such as locale or preview state—based on shared contextual data provided elsewhere in the app.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders embedded assets within rich text content {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses generated asset fields to type embedded asset data {kind: sync}
- [Ctf Richtext.Generated](ctf-richtext.generated.md) — Fetches hyperlink entry data via generated query hook {kind: sync}
- [Component Resolver](component-resolver.md) — Resolves and renders embedded entries as components {kind: sync}
- [Contentful Context](contentful-context.md) — Reads shared Contentful context for rendering behavior {kind: sync}
