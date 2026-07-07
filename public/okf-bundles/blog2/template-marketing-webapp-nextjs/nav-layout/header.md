---
type: React Component
icon: fe-component.svg
title: Header
description: Header is the top-level React component rendering the site's global navigation bar, shown at the top of every page in the marketing webapp. It wraps a logo link back to the homepage and the site navigation menu, giving visitors a consistent way to jump back to the index page or move through the site's other sections from anywhere in their journey.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_role: Presentational Component
---

The component pulls its layout dimensions from the shared theme module, using HEADER_HEIGHT and HEADER_HEIGHT_MD to size itself responsively across breakpoints and CONTAINER_WIDTH to align its contents with the rest of the page's content width. Navigation itself is delegated to a dedicated CtfNavigationGql component, which handles rendering the menu structure, keeping Header focused on layout and composition rather than nav-item logic.

# Relations

- [Ctf Navigation](ctf-navigation.md) — Renders the site navigation menu {kind: sync}
- [Link](link.md) — Links the logo back to the homepage {kind: sync}
- [Theme](../theme.md) — Sizes and aligns the header using shared theme constants {kind: sync}
- [Index Page](../index-page.md) — Logo link navigates to the homepage {kind: sync}
