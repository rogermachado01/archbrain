---
type: React Component
title: Layout
description: The Layout component serves as a structural wrapper for pages in this Next.js marketing web app template, assembling shared page chrome around the main content. It brings together the site's footer and mobile navigation menu, both sourced from Contentful-driven components, so that consistent branding and navigation appear across pages that use this layout.
level: component
owner: contentful/team-workflows
---

The Layout component serves as a structural wrapper for pages in this Next.js marketing web app template, assembling shared page chrome around the main content. It brings together the site's footer and mobile navigation menu, both sourced from Contentful-driven components, so that consistent branding and navigation appear across pages that use this layout.

By importing CtfFooterGql and CtfMobileMenuGql, Layout delegates the rendering of these content-managed sections to their respective components, which handle fetching and displaying data from Contentful via GraphQL. This keeps Layout focused on composition and page structure while the footer and mobile menu manage their own content and presentation logic.

# Relations

- [Ctf Footer Gql](ctf-footer-gql.md) — Renders the site footer {kind: sync}
- [Ctf Mobile Menu Gql](ctf-mobile-menu-gql.md) — Renders the mobile navigation menu {kind: sync}
