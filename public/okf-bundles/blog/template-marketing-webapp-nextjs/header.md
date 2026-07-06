---
type: React Component
title: Header
description: Header is the top-level React component responsible for rendering the site's header bar across pages built with this Next.js marketing web app template. It composes navigation and branding elements, laying them out within layout constants imported from the shared theme module, which define the header's height at different breakpoints and the overall container width used to align its contents with the rest of the page.
level: component
owner: contentful/team-workflows
---

Header is the top-level React component responsible for rendering the site's header bar across pages built with this Next.js marketing web app template. It composes navigation and branding elements, laying them out within layout constants imported from the shared theme module, which define the header's height at different breakpoints and the overall container width used to align its contents with the rest of the page.

Within the header, a home link is rendered using the shared Link component, pointing to the site's root path and resolving to the index page. The header also embeds the CtfNavigationGql component to render the site's navigation menu, which is presumably sourced from Contentful data. Together these pieces let Header serve as the persistent top-of-page navigation and branding area used across the template's pages.

# Relations

- [Ctf Navigation Gql](ctf-navigation-gql.md) — Renders the site navigation menu {kind: sync}
- [Link](link.md) — Displays a home/logo link {kind: sync}
- [Theme](theme.md) — Sizes and aligns the header using shared layout constants {kind: sync}
- [Index Page](index-page.md) — Home link navigates to the index page {kind: sync}
