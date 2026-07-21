---
type: React Component
title: Ctf Footer
description: CtfFooter renders the site-wide footer shown at the bottom of both the homepage (/) and dynamic content pages (/[slug]), giving visitors consistent navigation and branding no matter which page they land on.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Layout & Navigation
ddd_role: Presentational Component
---

It builds its layout using the shared CONTAINER_WIDTH constant to keep footer content aligned with the rest of the page, and pulls contextual Contentful data via useContentfulContext to render footer content sourced from the CMS. Internal navigation items are rendered with the shared Link component, while the footer's structure is populated from typed data: MenuGroupFieldsFragment supplies grouped sets of footer links, and PageLinkFieldsFragment supplies the individual link entries pointing to other pages in the site.

# Relations

- [Link](link.md) — Renders internal navigation links in the footer {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful context data to populate footer content {kind: sync}
- [Theme](theme.md) — Uses shared container width for consistent footer layout {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Consumes menu group data to structure footer link groups {kind: sync}
- [Page Link](page-link.md) — Consumes page link data for individual footer links {kind: sync}
