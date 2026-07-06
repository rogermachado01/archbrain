---
type: React Component
title: Ctf Mobile Menu Gql
description: ctf-mobile-menu-gql is a React component in the marketing web app template that serves as the GraphQL-connected wrapper for the mobile navigation menu. It renders the CtfMobileMenu component, delegating the actual presentation of the mobile menu UI to that component while handling the data-fetching concerns itself.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation Content
ddd_role: Data Fetching Component
---

ctf-mobile-menu-gql is a React component in the marketing web app template that serves as the GraphQL-connected wrapper for the mobile navigation menu. It renders the CtfMobileMenu component, delegating the actual presentation of the mobile menu UI to that component while handling the data-fetching concerns itself.

The component fetches navigation data using the generated useCtfNavigationQuery hook, which provides the query results needed to populate the mobile menu with the correct links and structure. It also reads from the Contentful context via useContentfulContext, allowing it to access shared Contentful state such as locale or preview mode when requesting or rendering navigation data. Together, these dependencies let ctf-mobile-menu-gql act as the data-aware entry point that supplies a fully rendered CtfMobileMenu with the navigation content pulled from Contentful.

# Relations

- [Ctf Mobile Menu](ctf-mobile-menu.md) — Renders the mobile navigation menu UI {kind: sync}
- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches navigation data for the mobile menu {kind: sync}
- [Contentful Context](contentful-context.md) — Reads shared Contentful context for locale/preview state {kind: sync}
