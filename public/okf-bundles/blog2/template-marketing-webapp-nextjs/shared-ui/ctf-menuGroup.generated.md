---
type: React Component
title: Ctf MenuGroup.Generated
description: ctf-menuGroup.generated renders on both the homepage (/) and dynamic content pages (/[slug]), acting as a generated component within the shared UI layer of this Next.js marketing site. Positioned in this shared location, it's likely part of navigation structures like menus or headers that appear consistently across these page types.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Layout & Navigation
ddd_role: Generated Data Component
---

The component draws on the page-link feature module, pulling in generated GraphQL fragment types to structure its data dependencies. This suggests ctf-menuGroup is composed of individual link items, each backed by the same typed fragment used elsewhere for page links, keeping link rendering consistent wherever navigation groups appear across the site.

# Relations

- [Page Link](page-link.md) — Uses PageLink fragment types to render individual links within the menu group {kind: sync}
