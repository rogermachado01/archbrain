---
type: React Component
title: Ctf Product Feature.Generated
description: This is a generated React component belonging to the marketing webapp Next.js template, specifically representing a product feature block used for the CTF (Contentful) integration. As a `.generated` module, it is produced by a code generation process, likely tied to GraphQL types or fragments defined in the Contentful schema, allowing the component to work with strongly typed data structures reflecting the underlying content model.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Product Content
ddd_role: Generated Type/Fragment
---

This is a generated React component belonging to the marketing webapp Next.js template, specifically representing a product feature block used for the CTF (Contentful) integration. As a `.generated` module, it is produced by a code generation process, likely tied to GraphQL types or fragments defined in the Contentful schema, allowing the component to work with strongly typed data structures reflecting the underlying content model.

The component depends on the ctf-asset concept, importing `AssetFieldsFragment` and `AssetFieldsFragmentDoc` from its generated module. This suggests that the product feature component displays or processes asset data—such as images or media—associated with a product feature entry, relying on the shared asset fragment definition to ensure consistent shape and typing of asset-related fields wherever they appear across the template.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses shared asset fragment to render feature media {kind: sync}
