---
type: React Component
title: Ctf Hero Banner.Generated
description: ctf-hero-banner.generated is a generated GraphQL artifact supporting the hero banner component in the marketing web app template. It defines the generated types and document nodes needed for the hero banner to consume content fields fetched from Contentful, allowing the component to render banner content in a type-safe way.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Hero Banner Content
ddd_role: Generated Type/Fragment
---

ctf-hero-banner.generated is a generated GraphQL artifact supporting the hero banner component in the marketing web app template. It defines the generated types and document nodes needed for the hero banner to consume content fields fetched from Contentful, allowing the component to render banner content in a type-safe way.

This artifact depends on two other generated fragments. It pulls in page link fields, which allow the hero banner to render a call-to-action or navigational link as part of its content. It also pulls in asset fields, which allow the hero banner to render an associated image or media asset, such as a background or featured graphic.

# Relations

- [Page Link.Generated](page-link.generated.md) — Supplies the call-to-action link shown in the hero banner {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Supplies the image or media asset displayed in the hero banner {kind: sync}
