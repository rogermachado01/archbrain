---
type: React Component
title: Ctf Hero Banner.Generated
description: ctf-hero-banner.generated is a generated GraphQL artifact supporting the Hero Banner component within the Next.js marketing template. It exists to make typed fragment data available to the component that renders the hero banner section of a page, pulling in the necessary fragment types and document definitions rather than defining them inline.
level: component
owner: contentful/team-workflows
---

ctf-hero-banner.generated is a generated GraphQL artifact supporting the Hero Banner component within the Next.js marketing template. It exists to make typed fragment data available to the component that renders the hero banner section of a page, pulling in the necessary fragment types and document definitions rather than defining them inline.

This module draws on two related generated fragments. It imports PageLinkFieldsFragment and PageLinkFieldsFragmentDoc from the page-link fragment module, which supplies the shape and query document for link data — likely used for any call-to-action or navigation link displayed within the hero banner. It also imports AssetFieldsFragment and AssetFieldsFragmentDoc from the ctf-asset fragment module, providing the typed structure and document for asset data such as images or media referenced by the hero banner.

By composing these imported fragments, ctf-hero-banner.generated ensures the Hero Banner component has consistent, reusable access to link and asset data shapes as defined elsewhere in the codebase, keeping the generated typings in sync with the underlying Contentful schema.

# Relations

- [Page Link.Generated](page-link.generated.md) — Supplies the link data used for the hero banner's call-to-action {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Supplies the asset data used for the hero banner's image or media {kind: sync}
