---
type: Next.js Page
title: Slug
description: Visiting any dynamic marketing path in the app resolves to this catch-all page, which renders the content assembled for the given slug. It sits at the top of the page tree for content-driven routes, pulling together the shared site chrome and the slug-specific content blocks into a single rendered page.
level: container
icon: fe-screen.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Pages
ddd_role: Page Component
---

To do this, the page relies on three generated GraphQL query hooks. It uses `useCtfNavigationQuery` to fetch and render the site navigation, `useCtfFooterQuery` to fetch and render the site footer, and `useCtfPageQuery` to fetch the Contentful page data matching the requested slug and render its content blocks. Together these calls let the page present a fully composed screen — header, body content, and footer — for whatever slug the visitor requested.

# Relations

- [Ctf Footer](layout-navigation/ctf-footer.md) — Renders the shared site footer {kind: sync}
- [Ctf Navigation](layout-navigation/ctf-navigation.md) — Renders the shared site navigation {kind: sync}
- [Ctf Page.Generated](contentful-content-blocks/ctf-page.generated.md) — Fetches and renders the slug's page content {kind: sync}
