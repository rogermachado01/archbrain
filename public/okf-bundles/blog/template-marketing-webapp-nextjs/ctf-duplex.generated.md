---
type: React Component
title: Ctf Duplex.Generated
description: "`ctf-duplex.generated` is a generated GraphQL artifact for the marketing web app template, associated with the \"Duplex\" content component. Rather than defining its own fields directly, it draws on two related generated modules to assemble the data shapes it needs: it pulls in `PageLinkFieldsFragment` (and its corresponding `PageLinkFieldsFragmentDoc`) from the page-link module, and `AssetFieldsFragment` (and its corresponding `AssetFieldsFragmentDoc`) from the ctf-asset module."
level: component
owner: contentful/team-workflows
---

`ctf-duplex.generated` is a generated GraphQL artifact for the marketing web app template, associated with the "Duplex" content component. Rather than defining its own fields directly, it draws on two related generated modules to assemble the data shapes it needs: it pulls in `PageLinkFieldsFragment` (and its corresponding `PageLinkFieldsFragmentDoc`) from the page-link module, and `AssetFieldsFragment` (and its corresponding `AssetFieldsFragmentDoc`) from the ctf-asset module.

In practice, this means the Duplex component's generated code is composed from smaller, reusable fragments describing page links and assets, rather than reimplementing that logic itself. This keeps the shape of Duplex's underlying data consistent with how page links and assets are defined elsewhere in the codebase, and lets the component reference those fragments when its queries are executed.

# Relations

- [Page Link.Generated](page-link.generated.md) — Reuses page link data for its linked content {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Reuses asset data for its media content {kind: sync}
- [Page Link.Generated](page-link.generated.md) — Provides the compiled page link query document {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Provides the compiled asset query document {kind: sync}
