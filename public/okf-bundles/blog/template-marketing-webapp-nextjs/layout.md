---
type: React Component
title: Layout
description: The `layout` component is a React component in the Next.js marketing web app template that provides the overall page structure for the site. It brings together shared, cross-page UI elements so that individual page templates don't need to redefine them, wrapping page content with consistent chrome across the application.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Site Shell
ddd_role: Layout Component
---

The `layout` component is a React component in the Next.js marketing web app template that provides the overall page structure for the site. It brings together shared, cross-page UI elements so that individual page templates don't need to redefine them, wrapping page content with consistent chrome across the application.

To do this, it imports `CtfFooterGql` for the site footer and `CtfMobileMenuGql` for the mobile navigation menu. These imported components are rendered as part of the layout's structure, giving pages that use `layout` a consistent footer and mobile menu experience without each page needing to assemble those pieces itself.

# Relations

- [Ctf Footer Gql](ctf-footer-gql.md) — Renders the site footer {kind: sync}
- [Ctf Mobile Menu Gql](ctf-mobile-menu-gql.md) — Renders the mobile navigation menu {kind: sync}
