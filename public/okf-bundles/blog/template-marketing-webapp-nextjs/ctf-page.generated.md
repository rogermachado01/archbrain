---
type: React Component
title: Ctf Page.Generated
description: `ctf-page.generated` is a generated React component module belonging to the marketing webapp Next.js template. As a generated artifact, its contents are produced from an upstream schema or query definition rather than hand-authored, and it is intended to be consumed by other parts of the application rather than edited directly.
level: component
owner: contentful/team-workflows
---

`ctf-page.generated` is a generated React component module belonging to the marketing webapp Next.js template. As a generated artifact, its contents are produced from an upstream schema or query definition rather than hand-authored, and it is intended to be consumed by other parts of the application rather than edited directly.

This module depends on the generated asset module, pulling in `AssetFieldsFragment` and `AssetFieldsFragmentDoc` from `ctf-asset.generated`. This suggests that a page rendered by this component can include associated media assets, with the fragment defining the shape of asset data and the fragment document used to compose or execute a GraphQL query that fetches it.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes asset data for media used on the page {kind: sync}
