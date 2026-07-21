---
type: React Component
title: Ctf Video
description: ctf-video is a React component in the Contentful media layer of the marketing webapp, rendered on the home page (/) and dynamic content pages (/[slug]) wherever a video asset is embedded in page content. It sits alongside ctf-asset as one of the media-rendering building blocks used to display Contentful-sourced content on these routes.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

The component relies on ctf-asset's generated GraphQL types to know the shape of the asset data it receives, indicating that video rendering is treated as a specialized case of the broader asset-handling logic rather than a fully independent data path.

# Relations

- [Ctf Asset](ctf-asset.md) — Uses asset field types to type the video data it renders {kind: sync}
