---
type: React Component
title: Ctf Product
description: CtfProduct is the React component that renders a Contentful-modeled product entry, pulling in its generated GraphQL fragment types to type the data it receives as props. It composes several other feature components to display the product's associated media and descriptive content, and falls back gracefully when the underlying Contentful entry can't be resolved.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

Rendering a product typically means showing an image or asset alongside rich text copy, so CtfProduct delegates asset rendering to CtfAsset and long-form or formatted descriptions to CtfRichtext rather than handling that markup itself. It also relies on a generated fragment from the sibling ctf-product-feature concept, suggesting products are composed of, or linked to, individual product features whose fields are typed via that fragment. If the product entry itself is missing or unresolved, it defers to EntryNotFound to render the standard missing-entry state instead of failing silently or crashing.

# Relations

- [Ctf Asset](../contentful-media/ctf-asset.md) — Renders the product's media asset {kind: sync}
- [Ctf Richtext](../contentful-content-blocks/ctf-richtext.md) — Renders the product's rich text description {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Types product feature data via the shared fragment {kind: sync}
- [Entry Not Found](../error-handling/entry-not-found.md) — Shows fallback UI when the product entry is missing {kind: sync}
