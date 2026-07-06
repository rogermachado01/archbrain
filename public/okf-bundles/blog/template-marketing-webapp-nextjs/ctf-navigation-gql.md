---
type: React Component
title: Ctf Navigation Gql
description: ctf-navigation-gql is a React component that acts as the data-fetching wrapper for the site navigation. Rather than rendering markup directly, it coordinates the retrieval of navigation content and hands it off to the presentational CtfNavigation component for actual display.
level: component
owner: contentful/team-workflows
---

ctf-navigation-gql is a React component that acts as the data-fetching wrapper for the site navigation. Rather than rendering markup directly, it coordinates the retrieval of navigation content and hands it off to the presentational CtfNavigation component for actual display.

To do its job, it relies on a generated GraphQL hook, useCtfNavigationQuery, to pull navigation data from Contentful, and it consults the Contentful context to pick up contextual information such as locale or preview mode needed to run that query correctly. Once the data is fetched, it passes the result along to CtfNavigation so the navigation UI can be rendered on the page.

# Relations

- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches navigation entries via generated query hook {kind: sync}
- [Ctf Navigation](ctf-navigation.md) — Passes fetched navigation data to the display component {kind: sync}
- [Contentful Context](contentful-context.md) — Reads locale and preview settings from Contentful context {kind: sync}
