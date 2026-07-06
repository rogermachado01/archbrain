---
type: React Component
title: Ctf Person.Generated
description: `ctf-person.generated` is a generated React Component belonging to the marketing web app template built on Next.js. As a generated artifact, it is part of the Contentful-backed data layer, likely produced from a GraphQL query definition that models a "Person" content type used across the marketing site.
level: component
owner: contentful/team-workflows
---

`ctf-person.generated` is a generated React Component belonging to the marketing web app template built on Next.js. As a generated artifact, it is part of the Contentful-backed data layer, likely produced from a GraphQL query definition that models a "Person" content type used across the marketing site.

This component depends on the generated asset module, pulling in `AssetFieldsFragment` and `AssetFieldsFragmentDoc` from `ctf-asset.generated`. This suggests that a Person entry includes an associated asset — such as a profile photo or avatar — and that this component reuses the shared asset fragment to ensure consistent fetching and typing of that image data wherever people are rendered (e.g., author bios, team listings, or testimonials).

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes person's profile image data via the shared asset fragment {kind: sync}
