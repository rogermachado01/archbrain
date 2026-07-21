---
type: React Component
title: Ctf Text Block
description: CtfTextBlock renders a Contentful-authored text content block within a marketing page, delegating the actual rich text rendering to CtfRichtext while pulling in styling and referenced content needed to display it correctly.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Text Content Blocks
ddd_role: Presentational Component
---

The component draws on the generated Contentful component map types to resolve typed references embedded in the text block's content, and it depends on asset fields to render any linked media (such as images) that may appear inline within the rich text. It also uses the shared theme utility to derive color configuration from a palette, letting authors control the block's visual styling (e.g. background or text color) through Contentful field data.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders the block's rich text content {kind: sync}
- [Theme](../generic-ui-utilities/theme.md) — Applies palette-based color styling to the block {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Resolves typed component references embedded in the text {kind: sync}
- [Ctf Asset](../contentful-media/ctf-asset.md) — Renders inline media assets referenced in the rich text {kind: sync}
