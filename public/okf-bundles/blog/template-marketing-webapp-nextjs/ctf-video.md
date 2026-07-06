---
type: React Component
title: Ctf Video
description: `ctf-video` is a React component within the `template-marketing-webapp-nextjs` template, part of the Contentful-driven component family (indicated by the `ctf-` prefix) used to render video content sourced from Contentful entries. As a component in this architecture, it fits into the broader marketing web app's pattern of feature components that map Contentful content types to renderable UI.
level: component
owner: contentful/team-workflows
---

`ctf-video` is a React component within the `template-marketing-webapp-nextjs` template, part of the Contentful-driven component family (indicated by the `ctf-` prefix) used to render video content sourced from Contentful entries. As a component in this architecture, it fits into the broader marketing web app's pattern of feature components that map Contentful content types to renderable UI.

The component relates to `ctf-asset.generated` by importing the `AssetFieldsFragment` type, suggesting that `ctf-video` relies on asset field data (such as underlying media references) generated from a GraphQL fragment associated with the `ctf-asset` component. This implies `ctf-video` uses asset-related type definitions to properly type or structure the video asset data it consumes or renders.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses generated asset field types to type its video asset data {kind: sync}
