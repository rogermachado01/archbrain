---
type: React Component
title: Ctf Asset
description: `ctf-asset` is a React component responsible for rendering a Contentful-managed media asset within the marketing webapp template. It works with the `AssetFieldsFragment` type generated from a GraphQL fragment, giving it access to the shape of asset data fetched from Contentful so that it can render assets in a type-safe way.
level: component
owner: contentful/team-workflows
---

`ctf-asset` is a React component responsible for rendering a Contentful-managed media asset within the marketing webapp template. It works with the `AssetFieldsFragment` type generated from a GraphQL fragment, giving it access to the shape of asset data fetched from Contentful so that it can render assets in a type-safe way.

Rather than handling all media rendering itself, `ctf-asset` delegates the actual display work to more specialized components: it uses `CtfImage` for rendering image assets and `CtfVideo` for rendering video assets. This makes `ctf-asset` effectively a dispatcher within the Contentful component ecosystem, selecting the appropriate presentational component based on the type of asset being rendered.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses generated fragment types to type asset data {kind: sync}
- [Ctf Image](ctf-image.md) — Delegates image assets to the image renderer {kind: sync}
- [Ctf Video](ctf-video.md) — Delegates video assets to the video renderer {kind: sync}
