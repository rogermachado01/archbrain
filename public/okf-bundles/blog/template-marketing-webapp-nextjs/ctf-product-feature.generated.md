---
type: React Component
title: Ctf Product Feature.Generated
description: `ctf-product-feature.generated` is a generated GraphQL artifact for the Product Feature component in the Next.js marketing web app template. As a generated module, it is not hand-written; it is produced from a GraphQL document to expose typed fragments and fragment documents that other parts of the app can consume when querying and rendering content from Contentful.
level: component
owner: contentful/team-workflows
---

`ctf-product-feature.generated` is a generated GraphQL artifact for the Product Feature component in the Next.js marketing web app template. As a generated module, it is not hand-written; it is produced from a GraphQL document to expose typed fragments and fragment documents that other parts of the app can consume when querying and rendering content from Contentful.

This particular file depends on the generated output for the `ctf-asset` component, pulling in both the `AssetFieldsFragment` type and its corresponding `AssetFieldsFragmentDoc`. This indicates that a Product Feature entry can reference an asset (such as an image) as part of its content model, and the generated code reuses the shared asset fragment definitions rather than redefining them, ensuring consistent typing and query composition between the Product Feature component and the Asset component across the codebase.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Imports typed asset fields for rendering feature media {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Reuses the asset fragment document to compose its GraphQL query {kind: sync}
