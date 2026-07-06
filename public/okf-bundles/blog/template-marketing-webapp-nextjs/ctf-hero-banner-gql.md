---
type: React Component
title: Ctf Hero Banner Gql
description: "ctf-hero-banner-gql is a React component that acts as the GraphQL-connected wrapper for the hero banner feature in the Next.js marketing web app template. Its role is to bridge data fetching and presentation: it relies on a generated hook to retrieve the hero banner content, then hands that data off to the presentational component responsible for rendering the banner's markup and styling."
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Hero Banner Content
ddd_role: Data Fetching Component
---

ctf-hero-banner-gql is a React component that acts as the GraphQL-connected wrapper for the hero banner feature in the Next.js marketing web app template. Its role is to bridge data fetching and presentation: it relies on a generated hook to retrieve the hero banner content, then hands that data off to the presentational component responsible for rendering the banner's markup and styling.

This separation keeps data-fetching logic isolated from display logic, so the query-handling concerns (via the generated hook) stay distinct from the visual rendering concerns (via the plain CtfHeroBanner component). Together, these two imports let ctf-hero-banner-gql serve as the composed entry point that other parts of the app can use to display a fully-loaded hero banner.

# Relations

- [Ctf Hero Banner.Generated](ctf-hero-banner.generated.md) — Fetches hero banner content via generated GraphQL hook {kind: sync}
- [Ctf Hero Banner](ctf-hero-banner.md) — Renders the fetched data using the presentational hero banner component {kind: sync}
