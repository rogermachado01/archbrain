---
type: Next.js Page
title: [Slug]
description: This is the catch-all dynamic route page in the Next.js marketing template, responsible for resolving and rendering any Contentful-driven page at runtime based on its slug. Rather than hardcoding content, the page relies on generated GraphQL query hooks to pull structured data for the shared layout pieces and the main page body from Contentful at request or build time.
level: component
owner: contentful/team-workflows
---

This is the catch-all dynamic route page in the Next.js marketing template, responsible for resolving and rendering any Contentful-driven page at runtime based on its slug. Rather than hardcoding content, the page relies on generated GraphQL query hooks to pull structured data for the shared layout pieces and the main page body from Contentful at request or build time.

To assemble a full page, it draws on three generated queries: one for the page's own content and structure, and two for the surrounding chrome shared across the site — the top navigation and the footer. Together these give the page everything it needs to render a complete, on-brand marketing page for whatever slug is requested.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Fetches footer content for the page {kind: sync}
- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches navigation content for the page {kind: sync}
- [Ctf Page.Generated](ctf-page.generated.md) — Fetches the page's main content {kind: sync}
