---
type: React Component
title: Ctf Video
description: `ctf-video` is a React component within the Next.js marketing web app template, part of the Contentful (ctf) component family responsible for rendering media content sourced from Contentful entries. As a video-focused component, it fits into the broader pattern of ctf-components that take Contentful field data and render corresponding UI, likely displaying a video asset such as a poster image or thumbnail derived from an associated media asset.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Asset Content
ddd_role: Presentational Component
---

`ctf-video` is a React component within the Next.js marketing web app template, part of the Contentful (ctf) component family responsible for rendering media content sourced from Contentful entries. As a video-focused component, it fits into the broader pattern of ctf-components that take Contentful field data and render corresponding UI, likely displaying a video asset such as a poster image or thumbnail derived from an associated media asset.

The component relies on generated GraphQL type definitions to understand the shape of the asset data it works with. Specifically, it imports the `AssetFieldsFragment` type from the generated types file associated with the `ctf-asset` component, indicating that `ctf-video` shares or reuses asset field typing to properly type-check or structure asset-related data (such as a video's cover image or file metadata) used in its rendering logic.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses generated asset field types to type video asset data {kind: sync}
