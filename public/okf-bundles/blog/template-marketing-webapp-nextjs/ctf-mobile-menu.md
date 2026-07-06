---
type: React Component
title: Ctf Mobile Menu
description: ctf-mobile-menu is a React component that renders the mobile navigation menu used in the marketing webapp template. It relies on the generated NavigationFieldsFragment type from the ctf-navigation component to type the navigation data it receives, indicating that the mobile menu displays or organizes the same navigation structure surfaced elsewhere in the site's header.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation Content
ddd_role: Presentational Component
---

ctf-mobile-menu is a React component that renders the mobile navigation menu used in the marketing webapp template. It relies on the generated NavigationFieldsFragment type from the ctf-navigation component to type the navigation data it receives, indicating that the mobile menu displays or organizes the same navigation structure surfaced elsewhere in the site's header.

To support in-menu navigation, the component uses the shared Link component rather than a plain anchor tag, ensuring that menu items behave consistently with other internal links across the application, such as client-side routing and prefetching behavior.

# Relations

- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Types its navigation items using the shared navigation data shape {kind: sync}
- [Link](link.md) — Renders mobile menu items as navigable links {kind: sync}
