---
type: React Component
title: Ctf Asset
description: CtfAsset is a React component that appears on the home page (/) and dynamic content pages (/[slug]), where it acts as a dispatcher for Contentful-managed media assets. Rather than rendering media directly, it delegates to either CtfImage or CtfVideo depending on the asset type being served, keeping asset-type branching logic out of the page components that use it.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Contentful Media
ddd_role: Presentational Component
---

By centralizing this choice in one place, CtfAsset lets the pages at / and /[slug] embed Contentful assets without needing to know in advance whether a given field will resolve to an image or a video.

# Relations

- [Ctf Image](ctf-image.md) — Delegates rendering to CtfImage for image assets {kind: sync}
- [Ctf Video](ctf-video.md) — Delegates rendering to CtfVideo for video assets {kind: sync}
