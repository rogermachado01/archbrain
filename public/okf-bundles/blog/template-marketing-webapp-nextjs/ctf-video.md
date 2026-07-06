---
type: React Component
title: Ctf Video
description: CtfVideo is a React component within the marketing web app template, responsible for rendering video content sourced from Contentful within the site's feature components.
level: component
owner: contentful/team-workflows
---

CtfVideo is a React component within the marketing web app template, responsible for rendering video content sourced from Contentful within the site's feature components.

To support its rendering needs, CtfVideo relies on the AssetFieldsFragment type imported from the generated ctf-asset module. This suggests that CtfVideo works with asset data structured according to the shared asset fields definition, likely to access properties such as the video file's URL or metadata needed for playback or display.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses shared asset field types to describe the video source {kind: sync}
