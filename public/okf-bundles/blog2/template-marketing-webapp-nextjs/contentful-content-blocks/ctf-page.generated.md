---
type: React Component
title: Ctf Page.Generated
description: ctf-page.generated is a React component in the Contentful content-blocks layer, generated to render the page-level content model wherever a route resolves to a Contentful page entry — the root route `/` and the dynamic `/[slug]` catch-all. As these are the two routes any visitor lands on when browsing the marketing site, this generated component sits at the top of the render tree for page content coming out of Contentful.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Page Composition
ddd_role: Generated Page Component
---

It pulls in AssetFieldsFragment and AssetFieldsFragmentDoc from the ctf-asset generated module, indicating that page rendering depends on shared asset field data (such as images) defined and queried elsewhere in the media layer.

# Relations

- [Ctf Asset](../contentful-media/ctf-asset.md) — Reuses shared asset fields when rendering page media {kind: sync}
