---
type: React Component
title: Ctf Text Block
description: CtfTextBlock is a React component that renders a text-based content block sourced from Contentful, pairing rich text content with theming support for marketing pages built on this template. It relies on typed fields generated from the Contentful component map and asset schema, indicating it accepts a reference-based content structure alongside optional image assets as part of its rendering logic.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

The component delegates the actual rich text rendering to CtfRichtext, keeping its own responsibility focused on layout and color styling rather than parsing or rendering structured text itself. It also draws on shared theme utilities to resolve color palette configuration, letting editors assign a visual theme to the block through Contentful without the component hardcoding styles. Its dependency on the generated component map fragments suggests CtfTextBlock fields may include references to other component types (such as CTAs or quotes), consistent with a flexible, editorially-composed content block used across marketing pages.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](theme.md) — Resolves the block's color theme from the selected palette {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Types the block's referenceable component fields from Contentful {kind: sync}
- [Ctf Asset](ctf-asset.md) — Types optional image asset fields attached to the block {kind: sync}
