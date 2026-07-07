---
type: Next.js Page
icon: fe-screen.svg
title: [Slug]
description: "A visitor navigating to any dynamic slug URL — such as a marketing landing page or content-driven route — lands on this Next.js page, which resolves the \"/[slug]\" path into rendered content. It assembles the page shell from Contentful-backed pieces: navigation and footer chrome that wrap the content, plus the core page content itself, all fetched via generated GraphQL query hooks."
level: container
owner: contentful/team-workflows
---

The page's structure reflects a typical content-managed layout: a persistent navigation bar and footer surround a body whose data comes from a dedicated page query. Each of these three pieces is sourced from its own generated hook, meaning the page's rendering depends on Contentful data being available at request or build time for the given slug.

# Relations

- [Ctf Footer](nav-layout/ctf-footer.md) — Renders the site footer {kind: sync}
- [Ctf Navigation](nav-layout/ctf-navigation.md) — Renders the site navigation bar {kind: sync}
- [Ctf Page.Generated](marketing-blocks/ctf-page.generated.md) — Fetches and renders the page's content {kind: sync}
