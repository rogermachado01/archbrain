---
type: React Component
icon: fe-component.svg
title: Ctf Product
description: CtfProduct renders a Contentful-driven product entry, composing media and text building blocks into a single product presentation used wherever product content is featured in the marketing site.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_role: Presentational Component
---

It pulls in CtfAsset to display product imagery and CtfRichtext to render formatted product descriptions or details, while relying on generated fragment types from ctf-product-feature to type the shape of associated product feature data it consumes. If the underlying Contentful entry is missing or unresolved, it defers to EntryNotFound to render a fallback state rather than breaking the page.

# Relations

- [Ctf Asset](../content-media/ctf-asset.md) — Displays the product's image or media asset {kind: sync}
- [Ctf Richtext](../content-rendering/ctf-richtext.md) — Renders the product's rich text description {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Types product feature data included with the product {kind: sync}
- [Entry Not Found](../error-resilience/entry-not-found.md) — Falls back to a not-found state when the product entry is missing {kind: sync}
