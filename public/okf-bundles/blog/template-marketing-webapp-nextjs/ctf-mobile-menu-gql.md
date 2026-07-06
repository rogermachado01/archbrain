---
type: React Component
title: Ctf Mobile Menu Gql
description: ctf-mobile-menu-gql is a React component that acts as the GraphQL-connected wrapper for the mobile navigation menu in the marketing webapp template. Rather than rendering markup directly, its role is to fetch the navigation data needed by the mobile menu and pass it down to the presentational component that handles the actual layout and interaction.
level: component
owner: contentful/team-workflows
---

ctf-mobile-menu-gql is a React component that acts as the GraphQL-connected wrapper for the mobile navigation menu in the marketing webapp template. Rather than rendering markup directly, its role is to fetch the navigation data needed by the mobile menu and pass it down to the presentational component that handles the actual layout and interaction.

To do this, it imports CtfMobileMenu, the underlying component responsible for rendering the mobile menu UI, and supplies it with the data it fetches. It uses the generated useCtfNavigationQuery hook to retrieve navigation content from Contentful, ensuring the mobile menu reflects the same navigation structure defined elsewhere in the site. It also relies on useContentfulContext to access contextual information such as locale or preview state, which is likely used to correctly scope or configure the navigation query.

Together, these dependencies let ctf-mobile-menu-gql serve as the data-fetching layer that bridges Contentful's navigation content model with the mobile menu's presentation, keeping query logic separate from rendering concerns.

# Relations

- [Ctf Mobile Menu](ctf-mobile-menu.md) — Passes fetched navigation data to render the mobile menu UI {kind: sync}
- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches navigation content to populate the mobile menu {kind: sync}
- [Contentful Context](contentful-context.md) — Reads contextual Contentful settings to scope the navigation query {kind: sync}
