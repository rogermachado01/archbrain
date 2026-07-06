---
type: React Component
title: Ctf Mobile Menu
description: ctf-mobile-menu is a React component in the Next.js marketing web app template that renders a mobile-oriented navigation menu. It is part of the ctf-components feature area, which suggests it is designed to work with content sourced from Contentful, consuming navigation data shaped by the `NavigationFieldsFragment` type to know which links and structure to display.
level: component
owner: contentful/team-workflows
---

ctf-mobile-menu is a React component in the Next.js marketing web app template that renders a mobile-oriented navigation menu. It is part of the ctf-components feature area, which suggests it is designed to work with content sourced from Contentful, consuming navigation data shaped by the `NavigationFieldsFragment` type to know which links and structure to display.

To render its navigation items, the component relies on the shared `Link` component from the app's shared component library, ensuring consistent link behavior (such as routing and styling) across the site. Together, these dependencies indicate that ctf-mobile-menu acts as a presentation layer for navigation data, translating a structured navigation fragment into a list of clickable links suited for smaller screens or collapsed menu states.

# Relations

- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Uses navigation data shape to populate menu items {kind: sync}
- [Link](link.md) — Renders menu items as navigable links {kind: sync}
