---
type: React Component
title: Layout
description: Layout is the shared React component that wraps page content with the site's persistent chrome, giving every page in the marketing webapp the same footer and mobile navigation without each page having to assemble them individually.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Layout & Navigation
ddd_role: Layout Component
---

To do this, Layout pulls in two Contentful-driven feature components: CtfFooterGql for the footer content and CtfMobileMenuGql for the mobile navigation menu. Both are GraphQL-backed components sourced from the ctf-components feature directory, meaning the structural chrome Layout provides is populated with content managed in Contentful rather than hardcoded.

# Relations

- [Ctf Footer](ctf-footer.md) — Renders the site footer {kind: sync}
- [Ctf Mobile Menu](ctf-mobile-menu.md) — Renders the mobile navigation menu {kind: sync}
