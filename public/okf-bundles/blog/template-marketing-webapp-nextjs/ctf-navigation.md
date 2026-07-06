---
type: React Component
title: Ctf Navigation
description: CtfNavigation is a React component responsible for rendering the site's navigation, using content sourced from Contentful. It relies on generated GraphQL typings, specifically the NavigationFieldsFragment, to ensure the shape of the navigation data it receives matches what has been queried from the CMS.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation Content
ddd_role: Presentational Component
---

CtfNavigation is a React component responsible for rendering the site's navigation, using content sourced from Contentful. It relies on generated GraphQL typings, specifically the NavigationFieldsFragment, to ensure the shape of the navigation data it receives matches what has been queried from the CMS.

To render the actual navigation links, the component uses a shared Link component, which likely standardizes link behavior (such as routing or styling) across the marketing web app. Together, these dependencies allow CtfNavigation to display a data-driven navigation menu with consistent link handling throughout the site.

# Relations

- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Types incoming navigation data from Contentful {kind: sync}
- [Link](link.md) — Renders each navigation link {kind: sync}
