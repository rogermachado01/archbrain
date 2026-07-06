---
type: React Component
title: Ctf Mobile Menu
description: CtfMobileMenu renders the collapsed navigation panel shown on small viewports, presenting the same navigation structure as the desktop header in a mobile-friendly layout. It consumes the shared `NavigationFieldsFragment` type from ctf-navigation to type its navigation data, ensuring the mobile and desktop menus stay consistent with the same Contentful-modeled navigation items.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation & Layout
ddd_role: Presentational Component
---

Navigation entries within the menu are rendered using the shared `Link` component, so clicking a menu item routes the user through the same link-handling logic used elsewhere in the app. The component also reads from `useContentfulContext`, giving it access to shared Contentful state (such as locale or preview mode) so that menu links and labels reflect the correct content context as the user navigates the site on mobile.

# Relations

- [Ctf Navigation](ctf-navigation.md) — Types its navigation items using shared navigation fragment fields {kind: sync}
- [Link](link.md) — Renders each mobile menu entry as a link {kind: sync}
- [Contentful Context](contentful-context.md) — Reads shared Contentful context for locale/preview-aware links {kind: sync}
