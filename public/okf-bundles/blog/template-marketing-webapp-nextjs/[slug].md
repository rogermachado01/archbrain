---
type: Next.js Page
title: [Slug]
description: The `[slug]` page is a dynamic Next.js route responsible for rendering marketing pages whose content is managed in Contentful. Rather than hard-coding page structure, it resolves the requested slug against generated GraphQL query hooks that fetch the page content, the site-wide navigation, and the site-wide footer, assembling them into a complete page view.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Page Routing
ddd_role: Page Component
---

The `[slug]` page is a dynamic Next.js route responsible for rendering marketing pages whose content is managed in Contentful. Rather than hard-coding page structure, it resolves the requested slug against generated GraphQL query hooks that fetch the page content, the site-wide navigation, and the site-wide footer, assembling them into a complete page view.

To do this, the page relies on three generated query hooks. It uses `useCtfPageQuery` to retrieve the main content for the page matching the given slug, `useCtfNavigationQuery` to fetch the shared navigation data shown across the site, and `useCtfFooterQuery` to fetch the shared footer data. Together these hooks let the `[slug]` page compose a full page layout from independently fetched, Contentful-backed pieces.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Fetches and renders the shared site footer {kind: sync}
- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches and renders the shared site navigation {kind: sync}
- [Ctf Page.Generated](ctf-page.generated.md) — Fetches and renders the page's main content for the given slug {kind: sync}
