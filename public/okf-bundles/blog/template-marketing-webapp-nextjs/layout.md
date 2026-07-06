---
type: React Component
title: Layout
description: The Layout component serves as a structural wrapper for pages within the marketing webapp template, assembling shared page chrome around the main content. It draws on two feature components to provide consistent navigation and footer elements across the site.
level: component
owner: contentful/team-workflows
---

The Layout component serves as a structural wrapper for pages within the marketing webapp template, assembling shared page chrome around the main content. It draws on two feature components to provide consistent navigation and footer elements across the site.

Specifically, Layout imports CtfFooterGql to render the site's footer content and CtfMobileMenuGql to provide mobile navigation. By composing these pieces together, Layout ensures that every page using it presents a consistent header/navigation and footer experience without each page needing to reimplement that structure.

# Relations

- [Ctf Footer Gql](ctf-footer-gql.md) — Renders the site footer {kind: sync}
- [Ctf Mobile Menu Gql](ctf-mobile-menu-gql.md) — Provides mobile navigation menu {kind: sync}
