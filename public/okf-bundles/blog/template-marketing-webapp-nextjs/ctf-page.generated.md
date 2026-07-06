---
type: React Component
title: Ctf Page.Generated
description: ctf-page.generated is a generated React component belonging to the marketing web app template, specifically representing a "page" content type sourced from a headless CMS (Contentful, given the "ctf-" naming convention). As a `.generated` file, it is not hand-authored but produced by a code generation pipeline, likely based on GraphQL queries or content type schemas defined elsewhere in the project.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Page Content
ddd_role: Generated Type/Fragment
---

ctf-page.generated is a generated React component belonging to the marketing web app template, specifically representing a "page" content type sourced from a headless CMS (Contentful, given the "ctf-" naming convention). As a `.generated` file, it is not hand-authored but produced by a code generation pipeline, likely based on GraphQL queries or content type schemas defined elsewhere in the project.

This component depends on the ctf-asset module, importing `AssetFieldsFragment` and `AssetFieldsFragmentDoc` from its generated output. This suggests that the page type includes one or more asset fields (such as images or media) as part of its content model, and the imported fragment is used to ensure consistent shape and typing for that asset data wherever it appears within the page's GraphQL operations or generated types.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Includes asset fields defined by the asset fragment {kind: sync}
