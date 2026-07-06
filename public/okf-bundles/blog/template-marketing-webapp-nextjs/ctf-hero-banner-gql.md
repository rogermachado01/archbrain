---
type: React Component
title: Ctf Hero Banner Gql
description: ctf-hero-banner-gql is a React component that acts as the GraphQL-connected wrapper for the hero banner feature. It sits alongside the presentational ctf-hero-banner component, responsible for fetching the data needed to render a hero banner and passing it down to that component for display.
level: component
owner: contentful/team-workflows
---

ctf-hero-banner-gql is a React component that acts as the GraphQL-connected wrapper for the hero banner feature. It sits alongside the presentational ctf-hero-banner component, responsible for fetching the data needed to render a hero banner and passing it down to that component for display.

To do this, it relies on a generated query hook, useCtfHeroBannerQuery, produced by the project's GraphQL code generation setup. This hook handles the actual data-fetching logic, allowing ctf-hero-banner-gql to focus on orchestrating the query and delegating the rendering work to the CtfHeroBanner component it imports.

# Relations

- [Ctf Hero Banner.Generated](ctf-hero-banner.generated.md) — Fetches hero banner data via generated query hook {kind: sync}
- [Ctf Hero Banner](ctf-hero-banner.md) — Passes fetched data to the hero banner view for rendering {kind: sync}
