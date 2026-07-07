---
type: React Component
icon: fe-component.svg
title: Ctf Navigation
description: CtfNavigation renders the top-level site navigation shown on both the home page (/) and dynamic content pages (/[slug]), giving visitors a consistent way to move between sections of the marketing site.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_role: Presentational Component
---

The component pulls its structure from Contentful-modeled data: menu groups are typed via MenuGroupFieldsFragment, and individual entries render through PageLinkFieldsFragment, allowing the navigation to reflect whatever menu hierarchy and page links are configured in the CMS rather than being hardcoded. It also reads from the Contentful context, which likely supplies preview/editing state or locale information needed to render links correctly across environments.

Internal links are rendered using the shared Link component, keeping navigation behavior (routing, prefetching, etc.) consistent with the rest of the app's link handling.

# Relations

- [Link](link.md) — Renders navigation links using the shared Link component {kind: sync}
- [Page Link](page-link.md) — Renders individual menu entries as page links {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Types and structures menu groups from CMS data {kind: sync}
- [Contentful Context](../content-rendering/contentful-context.md) — Reads Contentful context for navigation state {kind: sync}
