---
type: Next.js Page
title: Index Page
description: The index page is the Next.js page component that serves as the main entry point for the marketing site, assembling the primary layout and content sections a visitor sees on load. It relies on generated GraphQL query hooks to pull structured content from Contentful, rather than fetching data manually, keeping the page focused on composing components and passing along the fetched results.
level: component
owner: contentful/team-workflows
---

The index page is the Next.js page component that serves as the main entry point for the marketing site, assembling the primary layout and content sections a visitor sees on load. It relies on generated GraphQL query hooks to pull structured content from Contentful, rather than fetching data manually, keeping the page focused on composing components and passing along the fetched results.

To build the full page, it draws on three generated query hooks: one for the site navigation, one for the footer, and one for the main page content itself. Together these hooks let the index page render a complete, content-managed layout — header navigation, the body content defined in Contentful, and a closing footer — all wired together through Next.js data-fetching conventions.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Loads footer content for the page {kind: sync}
- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Loads navigation content for the page {kind: sync}
- [Ctf Page.Generated](ctf-page.generated.md) — Loads main page content from Contentful {kind: sync}
