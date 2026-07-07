---
type: React Component
icon: fe-component.svg
title: Ctf Asset
description: CtfAsset renders on the home page and on the dynamic `/[slug]` route, acting as a dispatcher for Contentful asset fields so the rest of the page doesn't need to branch on asset type itself.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_role: Presentational Component
---

Rather than rendering media directly, it delegates to a specialized component based on the asset's type: images are handed off to CtfImage and videos to CtfVideo, keeping the media-type-specific rendering logic out of the pages that use CtfAsset.

# Relations

- [Ctf Image](ctf-image.md) — Delegates image assets to CtfImage for rendering {kind: sync}
- [Ctf Video](ctf-video.md) — Delegates video assets to CtfVideo for rendering {kind: sync}
