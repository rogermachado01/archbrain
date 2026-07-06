---
type: React Component
title: Ctf Asset
description: `ctf-asset` is a React component responsible for rendering a Contentful asset within the marketing web app template, dispatching to the appropriate presentational component depending on the asset's underlying media type. It relies on the `AssetFieldsFragment` type generated from the corresponding GraphQL fragment to type-check the asset data it receives, ensuring the component works with a well-defined shape of Contentful asset fields.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Asset Content
ddd_role: Presentational Component
---

`ctf-asset` is a React component responsible for rendering a Contentful asset within the marketing web app template, dispatching to the appropriate presentational component depending on the asset's underlying media type. It relies on the `AssetFieldsFragment` type generated from the corresponding GraphQL fragment to type-check the asset data it receives, ensuring the component works with a well-defined shape of Contentful asset fields.

Based on the asset type, `ctf-asset` delegates rendering to either `ctf-image`, which handles image assets, or `ctf-video`, which handles video assets. This makes `ctf-asset` a routing layer that abstracts away asset-type branching from consuming components, letting the rest of the app work with a single generic asset component instead of handling images and videos separately.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Types incoming asset data using the generated fragment {kind: sync}
- [Ctf Image](ctf-image.md) — Renders image assets via CtfImage {kind: sync}
- [Ctf Video](ctf-video.md) — Renders video assets via CtfVideo {kind: sync}
