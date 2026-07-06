---
type: React Component
title: Ctf Duplex.Generated
description: `ctf-duplex.generated` is a generated artifact belonging to the Duplex React component within the `template-marketing-webapp-nextjs` template. As a generated module, it centralizes the GraphQL fragment types and fragment documents that the Duplex component depends on for its data shape, rather than containing hand-written component logic itself.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Duplex Content
ddd_role: Generated Type/Fragment
---

`ctf-duplex.generated` is a generated artifact belonging to the Duplex React component within the `template-marketing-webapp-nextjs` template. As a generated module, it centralizes the GraphQL fragment types and fragment documents that the Duplex component depends on for its data shape, rather than containing hand-written component logic itself.

This file pulls in two related generated modules. It imports `PageLinkFieldsFragment` and `PageLinkFieldsFragmentDoc` from the page-link generated module, which supplies the typed shape and query fragment for link data used elsewhere in the app. It also imports `AssetFieldsFragment` and `AssetFieldsFragmentDoc` from the ctf-asset generated module, providing the typed shape and fragment for asset (e.g., image or media) data. Together these imports let the Duplex component work with strongly-typed link and asset fields sourced from Contentful without redefining those fragments locally.

# Relations

- [Page Link.Generated](page-link.generated.md) — Supplies link data fields for Duplex content {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Supplies asset/media fields for Duplex content {kind: sync}
