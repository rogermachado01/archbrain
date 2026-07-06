---
type: React Component
title: Ctf Footer
description: CtfFooter renders the site-wide footer shown on both the home page (/) and content pages (/[slug]), giving visitors a consistent set of navigation links and site metadata at the bottom of every page in the marketing site.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation & Layout
ddd_role: Presentational Component
---

It builds its link structure from menu group data, using MenuGroupFieldsFragment to read grouped navigation entries and PageLinkFieldsFragment to resolve individual page links within those groups, then renders each as a Link component pointing to the appropriate route. Contentful preview/editing state is read via useContentfulContext, allowing the footer to behave correctly whether the page is rendered normally or inside the Contentful live preview. Layout width is kept consistent with the rest of the site by referencing the shared CONTAINER_WIDTH constant from the theme module.

# Relations

- [Link](link.md) — Renders footer navigation links using the shared Link component {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful preview/editing context to adapt footer rendering {kind: sync}
- [Theme](theme.md) — Aligns footer layout width with the shared theme container width {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Consumes menu group data to structure footer link sections {kind: sync}
- [Page Link](page-link.md) — Resolves individual page links within each footer menu group {kind: sync}
