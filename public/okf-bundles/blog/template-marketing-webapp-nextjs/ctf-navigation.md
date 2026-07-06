---
type: React Component
title: Ctf Navigation
description: `ctf-navigation` is a React component responsible for rendering the site's navigation. It relies on generated GraphQL types, importing `NavigationFieldsFragment` from its co-located generated file, which shapes the navigation data the component expects to receive as content from Contentful.
level: component
owner: contentful/team-workflows
---

`ctf-navigation` is a React component responsible for rendering the site's navigation. It relies on generated GraphQL types, importing `NavigationFieldsFragment` from its co-located generated file, which shapes the navigation data the component expects to receive as content from Contentful.

To render individual navigation entries, the component uses the shared `Link` component, ensuring that navigation items behave consistently with other links across the site, including any shared routing or styling logic that component provides.

# Relations

- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Types the navigation content fields {kind: sync}
- [Link](link.md) — Renders navigation links {kind: sync}
