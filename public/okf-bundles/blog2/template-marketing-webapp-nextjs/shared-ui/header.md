---
type: React Component
title: Header
description: Header is the shared React component rendered at the top of every page in the marketing site, giving visitors consistent site-wide navigation and branding as they move between pages. It wraps a home link and the site's navigation menu, and pulls layout constants that keep its height and content width consistent with the rest of the page.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Layout & Navigation
ddd_role: Presentational Component
---

The logo or brand element uses the shared Link component to route back to the index page, giving users a constant way to return to the homepage from anywhere in the app. The navigation itself is delegated to CtfNavigationGql, which supplies the actual menu structure and links, while Header handles positioning and sizing via HEADER_HEIGHT, HEADER_HEIGHT_MD, and CONTAINER_WIDTH imported from the shared theme.

# Relations

- [Ctf Navigation](ctf-navigation.md) — Renders the site navigation menu {kind: sync}
- [Link](link.md) — Links the logo/brand back to the homepage {kind: sync}
- [Theme](theme.md) — Sizes and positions the header using shared theme constants {kind: sync}
- [Index Page](../index-page.md) — Home link routes users to the index page {kind: sync}
