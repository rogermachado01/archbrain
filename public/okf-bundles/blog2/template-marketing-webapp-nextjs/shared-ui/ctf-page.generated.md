---
type: React Component
title: Ctf Page.Generated
description: ctf-page.generated is a generated GraphQL artifact backing the page-level content rendering used on the root route (/) and dynamic content routes (/[slug]), the two entry points through which visitors reach marketing pages built from Contentful content. As a generated file in the shared-ui layer, it exists to supply typed fragments and document definitions that other page-composition components consume when assembling a page's content model.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Generated Data Component
---

Its only known dependency is on the ctf-asset generated module, from which it imports AssetFieldsFragment and AssetFieldsFragmentDoc. This indicates that pages rendered through this concept can include asset fields (e.g. images or media metadata) as part of their content structure, reusing the same asset-fragment shape defined elsewhere in the shared-ui layer rather than redefining it.

# Relations

- [Ctf Asset](ctf-asset.md) — Pulls in shared asset field data for rendering page content {kind: sync}
