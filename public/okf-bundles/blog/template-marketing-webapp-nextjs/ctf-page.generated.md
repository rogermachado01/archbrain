---
type: React Component
title: Ctf Page.Generated
description: `ctf-page.generated` is a generated React Component that represents the Page entity from the marketing web app template, produced by GraphQL code generation. As a `.generated` module, its role is to expose typed fragments and related artifacts that other parts of the app can import and compose, rather than containing hand-written logic.
level: component
owner: contentful/team-workflows
---

`ctf-page.generated` is a generated React Component that represents the Page entity from the marketing web app template, produced by GraphQL code generation. As a `.generated` module, its role is to expose typed fragments and related artifacts that other parts of the app can import and compose, rather than containing hand-written logic.

It depends on `ctf-asset.generated`, from which it imports `AssetFieldsFragment` and `AssetFieldsFragmentDoc`. This indicates that a Page includes asset data (such as images or media) as part of its content model, and the generated Page code reuses the shared asset fragment definitions to query and type that data consistently with the rest of the app.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes asset data via the shared asset fragment {kind: sync}
