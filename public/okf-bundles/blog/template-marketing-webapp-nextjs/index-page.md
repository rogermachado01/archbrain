---
type: Next.js Page
title: Index Page
description: Visiting "/" loads this Next.js page, the entry point of the marketing site's homepage. It composes three shared UI concepts, each of which pulls in its own generated data-fetching hook to resolve Contentful-backed content before rendering.
level: container
owner: contentful/team-workflows
---

The page relies on generated GraphQL query hooks rather than fetching data itself directly in these components, delegating to ctf-footer, ctf-navigation, and ctf-page for their respective slices of the homepage layout. Together these three pieces assemble the full page shell: navigation at the top, the main page content in the middle, and the footer at the bottom.

# Relations

- [Ctf Footer](shared-ui/ctf-footer.md) — Renders the site footer {kind: sync}
- [Ctf Navigation](shared-ui/ctf-navigation.md) — Renders the site navigation {kind: sync}
- [Ctf Page.Generated](shared-ui/ctf-page.generated.md) — Fetches and renders the homepage content {kind: sync}
