---
type: React Component
title: Ctf Info Block.Generated
description: `ctf-info-block.generated` is a generated React component belonging to the Next.js marketing web app template, specifically the info block content module. As a generated artifact, it is produced from the underlying Contentful schema and is not intended to be hand-edited; it exists to render the info block's content and structure within the marketing site.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Info Block Content
ddd_role: Generated Type/Fragment
---

`ctf-info-block.generated` is a generated React component belonging to the Next.js marketing web app template, specifically the info block content module. As a generated artifact, it is produced from the underlying Contentful schema and is not intended to be hand-edited; it exists to render the info block's content and structure within the marketing site.

This component relies on the generated Contentful asset module, pulling in the `AssetFieldsFragment` type and its corresponding `AssetFieldsFragmentDoc` GraphQL document. This suggests the info block includes or references media assets (such as images) as part of its content, and it uses the shared asset fragment to query and type that asset data consistently with other components in the template.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses asset fragment to fetch and type embedded media for the info block {kind: sync}
