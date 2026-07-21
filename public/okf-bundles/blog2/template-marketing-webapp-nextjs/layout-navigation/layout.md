---
type: React Component
title: Layout
description: Layout composes the shared page shell that wraps marketing site content, pulling together the footer and mobile navigation menu so every page rendered through it presents a consistent header-to-footer structure.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Site Chrome
ddd_role: Layout Composition Component
---

It depends on two GraphQL-backed components: CtfFooterGql for the footer content and CtfMobileMenuGql for the mobile navigation experience, both sourced from the ctf-components feature directory. This positions Layout as the integration point where Contentful-driven UI pieces are assembled into the page frame surrounding whatever route-specific content is rendered inside it.

# Relations

- [Ctf Footer](ctf-footer.md) — Renders the site footer {kind: sync}
- [Ctf Mobile Menu](ctf-mobile-menu.md) — Renders the mobile navigation menu {kind: sync}
