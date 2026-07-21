---
type: React Component
title: Ctf Product
description: CtfProduct renders a Contentful-driven product entry, composing CtfAsset for imagery, CtfRichtext for descriptive copy, and product feature data typed via the generated ProductFeatureFieldsFragment to display feature lists alongside the product. If the underlying Contentful entry can't be resolved, it falls back to EntryNotFound rather than rendering a broken product block.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Catalog
ddd_role: Presentational Component
---

Because it relies on generated GraphQL fragment types for its feature data, CtfProduct is tightly coupled to the shape of product feature queries defined elsewhere in the Contentful schema, making it a composition point where asset rendering, rich text rendering, and typed feature data converge into a single product display component.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders the product's image or media asset {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the product's rich text description {kind: sync}
- [Ctf Product Feature.Generated](ctf-product-feature.generated.md) — Supplies typed product feature data for display {kind: sync}
- [Entry Not Found](entry-not-found.md) — Falls back to a not-found state when the entry is missing {kind: sync}
