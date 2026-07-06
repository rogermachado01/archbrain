---
type: React Component
title: Layout
description: The Layout component wraps page content in the shared page shell, assembling the mobile navigation and footer that appear around Contentful-driven marketing pages. It sits at the structural level of the app, providing the consistent frame that every route renders inside.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation & Layout
ddd_role: Layout Component
---

To build that frame, Layout pulls in CtfMobileMenuGql for the mobile navigation experience and CtfFooterGql for the page footer, both of which are Contentful-backed components responsible for fetching and rendering their respective GraphQL-sourced content.

# Relations

- [Ctf Footer](ctf-footer.md) — Renders the site footer {kind: sync}
- [Ctf Mobile Menu](ctf-mobile-menu.md) — Renders the mobile navigation menu {kind: sync}
