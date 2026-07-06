---
type: React Component
title: Ctf Navigation Gql
description: ctf-navigation-gql is a React component that acts as the data-fetching wrapper for the site's navigation. Rather than rendering markup directly, it is responsible for retrieving navigation content from Contentful and passing it down to the presentational CtfNavigation component for display.
level: component
owner: contentful/team-workflows
---

ctf-navigation-gql is a React component that acts as the data-fetching wrapper for the site's navigation. Rather than rendering markup directly, it is responsible for retrieving navigation content from Contentful and passing it down to the presentational CtfNavigation component for display.

To do its job, this component relies on a generated GraphQL hook to query navigation data from Contentful, and it consults the Contentful context to determine how that query should be executed (for example, respecting preview or locale settings shared across the app). Once the data is fetched, it delegates the actual rendering of the navigation UI to CtfNavigation, keeping data concerns separate from presentation.

# Relations

- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches navigation entries via the generated query hook {kind: sync}
- [Ctf Navigation](ctf-navigation.md) — Passes fetched navigation data to the navigation UI component {kind: sync}
- [Contentful Context](contentful-context.md) — Reads shared Contentful settings to configure the query {kind: sync}
