---
type: React Component
title: Ctf Duplex.Generated
description: `ctf-duplex.generated` is a generated module belonging to the React Component layer of the Next.js marketing web app template. Its role, based on the code it pulls in, is to assemble a "duplex" content block by combining page link data with asset data, both of which are sourced from other generated GraphQL fragment modules in the codebase.
level: component
owner: contentful/team-workflows
---

`ctf-duplex.generated` is a generated module belonging to the React Component layer of the Next.js marketing web app template. Its role, based on the code it pulls in, is to assemble a "duplex" content block by combining page link data with asset data, both of which are sourced from other generated GraphQL fragment modules in the codebase.

Specifically, this module imports `PageLinkFieldsFragment` and its corresponding document (`PageLinkFieldsFragmentDoc`) from the page-link component's generated file, giving it access to the shape and query definition for page link fields. It also imports `AssetFieldsFragment` and `AssetFieldsFragmentDoc` from the ctf-asset component's generated file, giving it access to the shape and query definition for asset fields. Together these imports suggest that the duplex component is used to render a paired layout — likely combining a linked page reference with an associated media asset — by relying on the fragment definitions and typed data structures generated elsewhere in the project rather than defining them itself.

# Relations

- [Page Link.Generated](page-link.generated.md) — Pulls in page link data for the duplex layout {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Pulls in asset/media data for the duplex layout {kind: sync}
