---
type: React Component
icon: fe-component.svg
title: Ctf Video
description: ctf-video is a React component rendered on the homepage and on generic content-driven pages (`/[slug]`), where it handles the display of video assets embedded within Contentful-authored page content. As visitors browse the marketing site's landing page or any slug-based content page, this component takes over whenever the page model includes a video field, rendering the media inline as part of the page layout.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_role: Presentational Component
---

To do so, ctf-video relies on ctf-asset, pulling in the `AssetFieldsFragment` type to type the asset data it receives. This suggests ctf-video acts as a thin wrapper or specialized case around the shared asset-handling logic, reusing the same field shape that other asset-rendering components (like images) depend on, rather than defining its own asset schema.

# Relations

- [Ctf Asset](ctf-asset.md) — Uses shared asset field types to render the video's underlying media asset {kind: sync}
