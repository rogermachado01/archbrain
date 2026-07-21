---
type: React Component
title: Ctf Cta
description: CtfCta renders a call-to-action block within Contentful-driven marketing pages, pairing a link with supporting copy so editors can drive visitors toward a target page or action.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Blocks
ddd_role: Presentational Component
---

It renders its body text through CtfRichtext, letting content editors format the CTA message with rich text rather than plain strings. Its visual treatment draws on the shared theme utilities to resolve color palette configurations, keeping the CTA's appearance consistent with other themed components across the site. The destination of the CTA is resolved using the generated page-link fragment types, tying the block to the structured page-link data returned from Contentful.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders formatted CTA body copy {kind: sync}
- [Theme](../generic-ui-utilities/theme.md) — Resolves the CTA's color palette from the theme {kind: sync}
- [Page Link](../layout-navigation/page-link.md) — Types the CTA's link target using page-link data {kind: sync}
