---
type: React Component
title: Ctf Mobile Menu Gql
description: ctf-mobile-menu-gql is a React component that serves as the GraphQL-connected wrapper around the mobile navigation menu in this Next.js marketing site template. It composes the underlying CtfMobileMenu presentational component with data fetched via a generated GraphQL query hook for navigation content, and combines this with Contentful preview/context state to determine how the menu should render.
level: component
owner: contentful/team-workflows
---

ctf-mobile-menu-gql is a React component that serves as the GraphQL-connected wrapper around the mobile navigation menu in this Next.js marketing site template. It composes the underlying CtfMobileMenu presentational component with data fetched via a generated GraphQL query hook for navigation content, and combines this with Contentful preview/context state to determine how the menu should render.

In practice, this component acts as a bridge between Contentful-sourced navigation data and the visual mobile menu, ensuring that the menu displayed to users reflects the current navigation structure and editing context (such as preview mode). It relies on the generated navigation query hook to retrieve the necessary data and on the Contentful context hook to access shared contextual state, then passes the resulting data down to the mobile menu component for display.

# Relations

- [Ctf Mobile Menu](ctf-mobile-menu.md) — Renders the mobile navigation menu UI {kind: sync}
- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches navigation content for the mobile menu {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful preview/editing context {kind: sync}
