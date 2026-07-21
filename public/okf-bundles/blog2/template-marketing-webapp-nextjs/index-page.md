---
type: Next.js Page
title: Index Page
description: The index page serves the root route "/" of the application, rendering the site's homepage. It pulls together the navigation, footer, and page content components to assemble the full-page layout that visitors first encounter when they load the app.
level: container
icon: fe-screen.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Pages
ddd_role: Page Component
---

To build this page, it draws on generated GraphQL query hooks from three feature components: `useCtfNavigationQuery` for the top navigation bar, `useCtfFooterQuery` for the site footer, and `useCtfPageQuery` for the main Contentful-driven page content. These hooks fetch the Contentful-backed data needed to populate each section of the rendered homepage.

# Relations

- [Ctf Footer](layout-navigation/ctf-footer.md) — Renders the site footer {kind: sync}
- [Ctf Navigation](layout-navigation/ctf-navigation.md) — Renders the site navigation bar {kind: sync}
- [Ctf Page.Generated](contentful-content-blocks/ctf-page.generated.md) — Fetches and renders the page content blocks {kind: sync}
