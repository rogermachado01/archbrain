---
type: React Component
title: Ctf Person.Generated
description: ctf-person.generated is a generated React component belonging to the marketing-webapp-nextjs template, representing a "Person" content type sourced from Contentful. As a generated artifact, it is likely produced by a GraphQL codegen process tied to the corresponding Contentful content model, giving the template typed access to person-related data such as fields defined on that content type.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Content
ddd_role: Generated Type/Fragment
---

ctf-person.generated is a generated React component belonging to the marketing-webapp-nextjs template, representing a "Person" content type sourced from Contentful. As a generated artifact, it is likely produced by a GraphQL codegen process tied to the corresponding Contentful content model, giving the template typed access to person-related data such as fields defined on that content type.

This component depends on generated code from the ctf-asset module, specifically importing the AssetFieldsFragment type and its associated AssetFieldsFragmentDoc GraphQL document. This suggests that a Person entry includes an associated asset field (for example, a photo or avatar), and the component reuses the shared asset fragment definition to query and type that related media data consistently with how assets are handled elsewhere in the template.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Reuses shared asset fragment to fetch the person's associated image {kind: sync}
