---
type: React Component
title: Ctf Duplex
description: CtfDuplex renders a Contentful "duplex" content block, a paired media-and-copy layout used within marketing pages to present an image or asset alongside rich text and an optional call-to-action link. It composes CtfImage for the visual side and CtfRichtext for the textual side, pulling color styling from the shared theme palette to keep the block visually consistent with surrounding sections.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Blocks
ddd_role: Presentational Component
---

The component relies on generated GraphQL fragments to type its Contentful data: PageLinkFieldsFragment supplies the shape of an optional navigational link (e.g. a "learn more" button pointing elsewhere in the site), while AssetFieldsFragment supplies the shape of the media asset passed through to CtfImage. This makes CtfDuplex a composite block assembled from lower-level media, text, and navigation building blocks rather than one that fetches or renders raw content itself.

# Relations

- [Ctf Image](../contentful-media/ctf-image.md) — Renders the block's image or media asset {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the accompanying rich text copy {kind: sync}
- [Theme](../generic-ui-utilities/theme.md) — Applies theme colors to the block's styling {kind: sync}
- [Page Link](../layout-navigation/page-link.md) — Supplies typing for an optional call-to-action link {kind: sync}
- [Ctf Asset](../contentful-media/ctf-asset.md) — Supplies typing for the block's media asset data {kind: sync}
