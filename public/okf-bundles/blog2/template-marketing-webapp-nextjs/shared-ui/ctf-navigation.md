---
type: React Component
title: Ctf Navigation
description: CtfNavigation renders the primary site navigation shown on the home page and on generic content pages (/[slug]), giving visitors a consistent way to move between sections regardless of which page they land on.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Layout & Navigation
ddd_role: Data Fetching Component
---

It builds its menu structure from Contentful-authored data: navigation groups come in via `MenuGroupFieldsFragment`, and individual entries within those groups are rendered as page links using `PageLinkFieldsFragment`. Internal navigation between routes is handled through the shared `Link` component, while `useContentfulContext` supplies contextual data (such as locale or preview state) needed to resolve links and content correctly across the app.

# Relations

- [Link](link.md) — Uses Link to navigate between site routes {kind: sync}
- [Page Link](page-link.md) — Renders individual navigation entries as page links {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Fetches menu group data defining the nav structure {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful context for locale/preview-aware rendering {kind: sync}
