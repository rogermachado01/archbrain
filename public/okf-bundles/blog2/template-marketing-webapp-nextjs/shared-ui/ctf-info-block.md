---
type: React Component
title: Ctf Info Block
description: CtfInfoBlock is a React component that renders a Contentful-driven content block combining an asset (image or media) with rich text, styled according to a selected color palette. It sits in the shared UI layer of the marketing template, composing lower-level Ctf components to produce a themeable, editorially-controlled section that content editors can drop into pages via Contentful entries.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

The component delegates asset rendering to CtfAsset and text rendering to CtfRichtext, keeping its own responsibility focused on layout and color coordination. It calls getColorConfigFromPalette to resolve the palette choice into concrete color values, ensuring the info block's background, text, and accent colors stay consistent with the site's broader theming system rather than being hardcoded.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders the block's media asset {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](theme.md) — Resolves palette selection into theme colors {kind: sync}
