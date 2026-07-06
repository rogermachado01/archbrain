---
type: React Component
title: Ctf Hero Banner Gql
description: ctf-hero-banner-gql is a React component that acts as the GraphQL-connected wrapper for the hero banner feature in this Next.js marketing template. Rather than rendering markup itself, its role is to bring together the generated query hook and the presentational component needed to display a hero banner backed by Contentful data.
level: component
owner: contentful/team-workflows
---

ctf-hero-banner-gql is a React component that acts as the GraphQL-connected wrapper for the hero banner feature in this Next.js marketing template. Rather than rendering markup itself, its role is to bring together the generated query hook and the presentational component needed to display a hero banner backed by Contentful data.

It imports useCtfHeroBannerQuery from the generated GraphQL artifacts, giving it the means to fetch hero banner content, and it imports the CtfHeroBanner component to handle the actual presentation of that content. Together these two relations describe a typical container/presentational split: this concept fetches the data and passes it through to the component responsible for rendering it.

# Relations

- [Ctf Hero Banner.Generated](ctf-hero-banner.generated.md) — Fetches hero banner content via generated query hook {kind: sync}
- [Ctf Hero Banner](ctf-hero-banner.md) — Passes fetched data to the presentational hero banner component {kind: sync}
