---
type: React Component
title: Ctf Hero Banner.Generated
description: ctf-hero-banner.generated is a generated GraphQL artifact for the CtfHeroBanner React component in the Next.js marketing template. It exists to bundle the typed fragments and document nodes that this component's data-fetching layer depends on, so that hero banner content coming from Contentful can be rendered with full type safety. Rather than defining its own queries from scratch, it composes fields from related content types that a hero banner typically needs to display.
level: component
owner: contentful/team-workflows
---

ctf-hero-banner.generated is a generated GraphQL artifact for the CtfHeroBanner React component in the Next.js marketing template. It exists to bundle the typed fragments and document nodes that this component's data-fetching layer depends on, so that hero banner content coming from Contentful can be rendered with full type safety. Rather than defining its own queries from scratch, it composes fields from related content types that a hero banner typically needs to display.

Specifically, this file draws in fragment types and documents for page links, which likely back any call-to-action or navigation link rendered within the hero banner, and for assets, which likely supply the image or media content shown in the banner. Both are pulled from their respective generated modules elsewhere in the codebase, reflecting a pattern where each component's generated file assembles the fragments of its child or referenced content types rather than duplicating field definitions.

# Relations

- [Page Link.Generated](page-link.generated.md) — Supplies the link data for the hero banner's call-to-action {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Supplies the image asset displayed in the hero banner {kind: sync}
