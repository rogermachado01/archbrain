---
type: Next.js Page
title: Index Page
description: The index page is the Next.js entry point for the marketing site's home route. It assembles the standard page shell, pulling in generated GraphQL query hooks to fetch the content needed for the layout and body of the page from Contentful. Rather than composing markup directly, it relies on generated data-fetching hooks associated with the navigation, footer, and main page components to retrieve the structured content that drives what's rendered.
level: component
owner: contentful/team-workflows
---

The index page is the Next.js entry point for the marketing site's home route. It assembles the standard page shell, pulling in generated GraphQL query hooks to fetch the content needed for the layout and body of the page from Contentful. Rather than composing markup directly, it relies on generated data-fetching hooks associated with the navigation, footer, and main page components to retrieve the structured content that drives what's rendered.

In practice, this means the index page coordinates three generated query hooks: one for the site navigation, one for the footer, and one for the core page content itself. Each hook corresponds to a distinct structural region of the page, so the index page's role is largely that of an orchestrator, wiring together the data needed to render the top navigation, the main content area, and the footer into a single cohesive home page view.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Fetches footer content for the home page {kind: sync}
- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches navigation content for the home page {kind: sync}
- [Ctf Page.Generated](ctf-page.generated.md) — Fetches main page content for the home page {kind: sync}
