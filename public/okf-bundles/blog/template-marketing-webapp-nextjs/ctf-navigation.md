---
type: React Component
title: Ctf Navigation
description: CtfNavigation is a React component that renders the marketing site's navigation, composing data and shared UI to present the site's navigational links to visitors. It relies on a generated GraphQL fragment, NavigationFieldsFragment, to obtain the typed content fields needed to build the navigation structure, keeping the component decoupled from the raw query definitions.
level: component
owner: contentful/team-workflows
---

CtfNavigation is a React component that renders the marketing site's navigation, composing data and shared UI to present the site's navigational links to visitors. It relies on a generated GraphQL fragment, NavigationFieldsFragment, to obtain the typed content fields needed to build the navigation structure, keeping the component decoupled from the raw query definitions.

To render individual navigation entries, the component uses the shared Link component, ensuring links behave consistently with the rest of the application, including any shared routing or styling conventions that component provides.

# Relations

- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Supplies typed navigation content fields {kind: sync}
- [Link](link.md) — Renders each navigation link {kind: sync}
