---
type: Next.js Page
title: [Slug]
description: "The `[slug]` page is the Next.js dynamic route responsible for rendering marketing pages by slug in this template. As a page-level component, it composes several generated GraphQL hooks to assemble the parts of the page: it pulls in the footer, navigation, and main page content, each sourced from Contentful via dedicated generated query hooks. This makes the `[slug]` route the central integration point where shared layout pieces and page-specific content come together for any given slug."
level: component
owner: contentful/team-workflows
---

The `[slug]` page is the Next.js dynamic route responsible for rendering marketing pages by slug in this template. As a page-level component, it composes several generated GraphQL hooks to assemble the parts of the page: it pulls in the footer, navigation, and main page content, each sourced from Contentful via dedicated generated query hooks. This makes the `[slug]` route the central integration point where shared layout pieces and page-specific content come together for any given slug.

In practice, the page relies on `useCtfFooterQuery` to fetch footer content, `useCtfNavigationQuery` to fetch navigation/menu content, and `useCtfPageQuery` to fetch the actual page body content associated with the requested slug. Together these generated hooks provide all the data needed to render a complete marketing page, with the footer and navigation supplying consistent site-wide chrome and the page query supplying the slug-specific content.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Fetches footer content for the page {kind: sync}
- [Ctf Navigation.Generated](ctf-navigation.generated.md) — Fetches navigation content for the page {kind: sync}
- [Ctf Page.Generated](ctf-page.generated.md) — Fetches slug-specific page content {kind: sync}
