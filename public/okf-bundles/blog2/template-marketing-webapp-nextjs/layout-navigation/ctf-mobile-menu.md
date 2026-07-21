---
type: React Component
title: Ctf Mobile Menu
description: CtfMobileMenu renders the mobile navigation panel within the marketing site's layout, presenting the same navigation structure as the desktop header but adapted for smaller viewports. It consumes navigation data shaped by the NavigationFieldsFragment, meaning its menu items and links mirror whatever content editors configure for the primary site navigation.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation Menu
ddd_role: Contentful-Connected Component
---

To render individual navigation entries, the component relies on the shared Link component, ensuring that internal and external links behave consistently with the rest of the app's link handling — including any shared logic for routing, prefetching, or target resolution. It also reads from the Contentful context via useContentfulContext, giving it access to preview or environment-specific state needed to correctly resolve content in different Contentful modes (e.g., preview vs. published).

# Relations

- [Ctf Navigation](ctf-navigation.md) — Consumes navigation fields to populate mobile menu items {kind: sync}
- [Link](link.md) — Renders each mobile menu item as a link {kind: sync}
- [Contentful Context](../generic-ui-utilities/contentful-context.md) — Reads Contentful context to resolve content state {kind: sync}
