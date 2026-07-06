---
type: React Component
title: Ctf Navigation Gql
description: ctf-navigation-gql is a React component that acts as the data-fetching wrapper for the site navigation. Rather than rendering markup itself, it relies on a generated query hook to retrieve navigation content from Contentful and then hands that data off to the presentational CtfNavigation component for rendering.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation Content
ddd_role: Data Fetching Component
---

ctf-navigation-gql is a React component that acts as the data-fetching wrapper for the site navigation. Rather than rendering markup itself, it relies on a generated query hook to retrieve navigation content from Contentful and then hands that data off to the presentational CtfNavigation component for rendering.

To do this correctly, the component also reads from the Contentful context, which supplies shared editorial or preview-related state needed to fetch and display the navigation appropriately. In practice, this component sits between the raw GraphQL query layer and the visual navigation component, coordinating data retrieval with contextual settings before the navigation is shown to the user.

# Relations

- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches navigation content via the generated query hook {kind: sync}
- [Ctf Navigation](ctf-navigation.md) — Passes fetched navigation data to the navigation component for display {kind: sync}
- [Contentful Context](contentful-context.md) — Reads shared Contentful context for fetching navigation data {kind: sync}
