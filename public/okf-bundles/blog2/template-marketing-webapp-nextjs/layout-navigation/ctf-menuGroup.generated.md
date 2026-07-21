---
type: React Component
title: Ctf MenuGroup.Generated
description: On the home page and every content page rendered from `/[slug]`, `ctf-menuGroup.generated` builds the navigation structure shown in the layout, grouping related links together for the site's menu.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation Menu
ddd_role: Generated Contentful Component
---

It relies on generated GraphQL artifacts from the page-link feature — `PageLinkFieldsFragment` and its companion document `PageLinkFieldsFragmentDoc` — to describe the shape and query fragment for each link it renders within the group, keeping the menu's link data consistent with how individual page links are fetched elsewhere in the app.

# Relations

- [Page Link](page-link.md) — Uses page-link's generated fragment to render each link in the menu group {kind: sync}
