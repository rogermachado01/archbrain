---
type: Next.js Page
title: Index Page
description: The index page is the Next.js entry point for the site's marketing home route, responsible for assembling the overall page shell and its content. It relies on generated GraphQL query hooks to pull in the data needed for the primary structural pieces of the page, keeping data fetching colocated with the components that consume it.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Page Routing
ddd_role: Page Component
---

The index page is the Next.js entry point for the site's marketing home route, responsible for assembling the overall page shell and its content. It relies on generated GraphQL query hooks to pull in the data needed for the primary structural pieces of the page, keeping data fetching colocated with the components that consume it.

Specifically, the index page draws on three generated query hooks: one for the site footer, one for the site navigation, and one for the main Contentful-driven page content. Together these hooks let the page render a consistent header/footer frame around dynamically fetched page content, with each concern (navigation, footer, page body) handled by its own dedicated query.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Renders the site footer {kind: sync}
- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Renders the site navigation {kind: sync}
- [Ctf Page.Generated](ctf-page.generated.md) — Fetches and renders the main page content {kind: sync}
