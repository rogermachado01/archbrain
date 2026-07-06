---
type: React Component
title: Ctf Asset
description: `ctf-asset` is a React component that renders a Contentful asset, dispatching to either an image or video presentation depending on the asset's content type. It relies on the `AssetFieldsFragment` type generated from its GraphQL fragment definition to type the asset data it receives as props.
level: component
owner: contentful/team-workflows
---

`ctf-asset` is a React component that renders a Contentful asset, dispatching to either an image or video presentation depending on the asset's content type. It relies on the `AssetFieldsFragment` type generated from its GraphQL fragment definition to type the asset data it receives as props.

To handle the two supported media kinds, the component delegates rendering to two specialized child components: `CtfImage` for image assets and `CtfVideo` for video assets. This makes `ctf-asset` a thin routing layer that normalizes how Contentful asset data is consumed elsewhere in the marketing site, while the actual rendering logic for each media type lives in its respective dedicated component.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Types the asset props using the generated fragment {kind: sync}
- [Ctf Image](ctf-image.md) — Renders image assets via CtfImage {kind: sync}
- [Ctf Video](ctf-video.md) — Renders video assets via CtfVideo {kind: sync}
