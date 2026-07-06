---
type: React Component
title: Ctf Page.Generated
description: This generated component backs the pages served at `/` and `/[slug]`, meaning it's the piece rendered whenever a visitor lands on the marketing site's home page or any content-driven page route. Being a `.generated` file, it's produced from a GraphQL fragment/document setup rather than hand-authored, so its structure follows whatever page-level content shape Contentful returns for these routes.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Marketing Content Blocks
ddd_role: Generated Page Component
---

To render any assets embedded in the page content, it pulls in the asset fragment definitions from the shared `ctf-asset` component, giving it access to the typed fields and query document needed to request and display asset data (such as images) alongside the rest of the page's content.

# Relations

- [Ctf Asset](ctf-asset.md) — Requests asset fields for images shown on the page {kind: sync}
