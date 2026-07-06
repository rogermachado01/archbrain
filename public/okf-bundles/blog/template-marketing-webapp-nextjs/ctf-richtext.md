---
type: React Component
title: Ctf Richtext
description: CtfRichtext is a React component responsible for rendering Contentful rich text fields within the marketing webapp template. It renders embedded assets by delegating to the CtfAsset component, and handles generic embedded entries by passing them through the ComponentResolver, which selects the appropriate component to render based on entry type. This allows rich text content authored in Contentful—mixing plain text, images, and embedded components—to be displayed correctly within the page.
level: component
owner: contentful/team-workflows
---

CtfRichtext is a React component responsible for rendering Contentful rich text fields within the marketing webapp template. It renders embedded assets by delegating to the CtfAsset component, and handles generic embedded entries by passing them through the ComponentResolver, which selects the appropriate component to render based on entry type. This allows rich text content authored in Contentful—mixing plain text, images, and embedded components—to be displayed correctly within the page.

For rich text hyperlinks that reference Contentful entries rather than plain URLs, the component uses a generated query hook to resolve the linked entry's data, such as its slug, so it can construct the correct link. It also reads from the shared Contentful context, likely to access preview mode or locale settings needed when resolving these queries and rendering content appropriately.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders embedded asset nodes within rich text {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses generated asset field types for embedded assets {kind: sync}
- [Ctf Richtext.Generated](ctf-richtext.generated.md) — Fetches linked entry data for rich text hyperlinks {kind: sync}
- [Component Resolver](component-resolver.md) — Resolves and renders embedded entry components {kind: sync}
- [Contentful Context](contentful-context.md) — Reads shared Contentful context for rendering settings {kind: sync}
