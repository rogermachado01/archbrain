---
type: React Component
title: Ctf Mobile Menu
description: ctf-mobile-menu is a React component in the Next.js marketing web app template responsible for rendering the mobile navigation menu. It relies on typed navigation data shaped by the NavigationFieldsFragment, which defines the structure of navigation content pulled from Contentful, ensuring the component has access to the correct fields when building out the menu's links and structure.
level: component
owner: contentful/team-workflows
---

ctf-mobile-menu is a React component in the Next.js marketing web app template responsible for rendering the mobile navigation menu. It relies on typed navigation data shaped by the NavigationFieldsFragment, which defines the structure of navigation content pulled from Contentful, ensuring the component has access to the correct fields when building out the menu's links and structure.

To let users move between pages, ctf-mobile-menu uses the shared Link component rather than a raw anchor tag, keeping navigation consistent with the rest of the application's routing and link-handling behavior. Together, these dependencies let the component focus on presentation and interaction for the mobile menu while delegating data typing and navigation logic to shared, reusable pieces of the codebase.

# Relations

- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Uses navigation content fields to populate the mobile menu {kind: sync}
- [Link](link.md) — Renders menu items as navigable links {kind: sync}
