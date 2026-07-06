---
type: React Component
title: Ctf Quote.Generated
description: This is a generated GraphQL artifact for the Quote component within the Next.js marketing web app template, providing the typed fragment definitions used to fetch and render quote content sourced from Contentful. As a generated file, it exists to support the component map system that resolves rich text or dynamic component references into the correct React component at render time — in this case, the Quote component.
level: component
owner: contentful/team-workflows
---

This is a generated GraphQL artifact for the Quote component within the Next.js marketing web app template, providing the typed fragment definitions used to fetch and render quote content sourced from Contentful. As a generated file, it exists to support the component map system that resolves rich text or dynamic component references into the correct React component at render time — in this case, the Quote component.

The file pulls in shared fragment definitions from two places: the component reference fields fragments, which enumerate all the possible component types (CTA, Duplex, HeroBanner, InfoBlock, ProductTable, Quote, TextBlock, and various topic and menu fragments) that can appear in a referenced component map, and the asset fields fragment, which provides the typed shape for media assets (such as an avatar or attributed image) that a quote entry might include. Together these imports let the Quote component's generated GraphQL types stay consistent with the broader shared schema used across the template.

# Relations

- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Resolves quote entries within the shared component map used across page content {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes associated media asset data for quote attribution {kind: sync}
