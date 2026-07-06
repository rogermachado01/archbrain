---
type: React Component
title: Header
description: Header is a React component that renders the top navigation area of the marketing webapp template. It composes the site's primary layout chrome, combining a home link with the navigation content and sizing constraints defined for the header region.
level: component
owner: contentful/team-workflows
---

Header is a React component that renders the top navigation area of the marketing webapp template. It composes the site's primary layout chrome, combining a home link with the navigation content and sizing constraints defined for the header region.

The component imports CtfNavigationGql to render the actual navigation menu, which is presumably populated from Contentful data elsewhere in the app. It uses the shared Link component to wrap the site logo or brand element, pointing users back to the home page. Layout constants such as header height (in both default and medium breakpoint variants) and container width are pulled from the shared theme module to keep the header's dimensions and content width consistent with the rest of the site.

# Relations

- [Ctf Navigation Gql](ctf-navigation-gql.md) — Renders the navigation menu {kind: sync}
- [Link](link.md) — Links back to the home page {kind: sync}
- [Theme](theme.md) — Applies shared layout sizing constants {kind: sync}
- [Index Page](index-page.md) — Sends users to the home page {kind: sync}
