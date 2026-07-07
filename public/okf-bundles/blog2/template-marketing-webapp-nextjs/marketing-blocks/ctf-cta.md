---
type: React Component
icon: fe-component.svg
title: Ctf Cta
description: CtfCta is a React component in the marketing template's shared UI layer that renders a call-to-action element, pulling together rich text content, themed color styling, and page link data so editors can compose a styled, clickable CTA block from Contentful entries.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_role: Presentational Component
---

It renders its body copy through CtfRichtext, letting the CTA display formatted text rather than a plain label. To match the site's visual system, it derives its color scheme via getColorConfigFromPalette from the shared theme module, so a CTA's background and text colors stay consistent with whatever palette option is configured on the Contentful entry. For the actual link destination, it consumes PageLinkFieldsFragment data generated from the page-link component, tying the CTA's click target to another page within the site.

# Relations

- [Ctf Richtext](../content-rendering/ctf-richtext.md) — Renders the CTA's rich text body content {kind: sync}
- [Theme](../theme.md) — Applies themed color styling to the CTA {kind: sync}
- [Page Link](../nav-layout/page-link.md) — Resolves the CTA's click-through page link {kind: sync}
