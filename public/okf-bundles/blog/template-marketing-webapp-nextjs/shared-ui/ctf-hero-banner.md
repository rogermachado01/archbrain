---
type: React Component
title: Ctf Hero Banner
description: CtfHeroBanner is the component behind large promotional banners that sit at the top of marketing pages built from Contentful data, combining a background asset, rich text content, and an optional call-to-action link into a single hero section. It renders CtfRichtext to display the banner's formatted copy, so any headline, body text, or inline styling authored in Contentful flows through this shared rich text renderer rather than being handled inline.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Content Blocks
ddd_role: Presentational Component
---

The banner pulls its background image or media from the shared ctf-asset generated fragment, letting Contentful editors swap hero visuals without code changes, while an optional PageLink fragment supplies the destination and label for a button or link layered over the banner. Layout and color choices are derived from the shared theme module, which supplies palette-based color configuration along with header height constants (HEADER_HEIGHT_MD, HEADER_HEIGHT) so the banner can correctly offset or size itself relative to the fixed site header across breakpoints.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders the banner's rich text content {kind: sync}
- [Theme](theme.md) — Sizes and colors the banner relative to the site header {kind: sync}
- [Page Link](page-link.md) — Supplies the banner's call-to-action link {kind: sync}
- [Ctf Asset](ctf-asset.md) — Supplies the banner's background asset {kind: sync}
