---
type: React Component
title: Ctf Person.Generated
description: `ctf-person.generated` is a generated React component belonging to the marketing web app template, part of the family of `.generated` files produced from GraphQL Codegen definitions in this codebase. It represents the typed output for a "Person" content type, and like its sibling generated modules, it relies on shared fragment definitions to describe the shape of associated media assets attached to a person entry.
level: component
owner: contentful/team-workflows
---

`ctf-person.generated` is a generated React component belonging to the marketing web app template, part of the family of `.generated` files produced from GraphQL Codegen definitions in this codebase. It represents the typed output for a "Person" content type, and like its sibling generated modules, it relies on shared fragment definitions to describe the shape of associated media assets attached to a person entry.

Specifically, this file draws on the asset-related generated code from the `ctf-asset` module, pulling in both the TypeScript type describing asset fields and the corresponding GraphQL document fragment. This allows the person component's generated types and queries to correctly reference and validate any asset data (such as a photo or avatar) embedded within a person record, keeping the shape of that data consistent with the rest of the app's asset-handling logic.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses the asset fields type to describe a person's associated media {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes the asset fragment document to fetch a person's associated media {kind: sync}
