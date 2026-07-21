---
type: React Component
title: Ctf Asset
description: CtfAsset acts as a dispatcher component that renders the appropriate media component for a Contentful asset, appearing wherever media content is rendered on the home page (/) and dynamic content pages (/[slug]). Rather than handling image or video rendering itself, it delegates to the specialized CtfImage or CtfVideo components based on the asset type it receives.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

By centralizing this branching logic, CtfAsset lets other page-level or section components reference a single, uniform entry point for media rendering without needing to know upfront whether a given Contentful asset is an image or a video.

# Relations

- [Ctf Image](ctf-image.md) — Delegates image assets to CtfImage for rendering {kind: sync}
- [Ctf Video](ctf-video.md) — Delegates video assets to CtfVideo for rendering {kind: sync}
