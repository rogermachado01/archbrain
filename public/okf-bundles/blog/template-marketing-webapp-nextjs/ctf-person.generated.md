---
type: React Component
title: Ctf Person.Generated
description: `ctf-person.generated` is a generated React component belonging to the marketing webapp Next.js template. As a generated artifact, it is part of a set of files produced from a shared schema or codegen process, and it depends on sibling generated modules for the typed data it needs to render or process content correctly.
level: component
owner: contentful/team-workflows
---

`ctf-person.generated` is a generated React component belonging to the marketing webapp Next.js template. As a generated artifact, it is part of a set of files produced from a shared schema or codegen process, and it depends on sibling generated modules for the typed data it needs to render or process content correctly.

Specifically, this component relies on the `ctf-asset.generated` module, importing `AssetFieldsFragment` and `AssetFieldsFragmentDoc` from it. This suggests that a "person" entity in the content model includes an associated asset—likely a profile photo or avatar—and the component uses these imported fragment types and documents to ensure the asset data conforms to the expected GraphQL fragment shape wherever person-related content is queried or displayed.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Reuses asset fragment to render the person's associated image {kind: sync}
