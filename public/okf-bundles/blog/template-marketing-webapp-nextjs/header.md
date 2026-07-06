---
type: React Component
title: Header
description: Header is a React component that renders the top-level navigation bar for the marketing web app. It combines a home link with a rendered navigation feature and applies layout constants to keep its sizing and width consistent with the rest of the page shell.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Site Shell
ddd_role: Presentational Component
---

Header is a React component that renders the top-level navigation bar for the marketing web app. It combines a home link with a rendered navigation feature and applies layout constants to keep its sizing and width consistent with the rest of the page shell.

The component wraps its logo or brand element in a Link pointing to the root path, which resolves to the site's index page, giving users a way back to the homepage from anywhere the header appears. It also renders CtfNavigationGql, delegating the actual navigation menu structure and content to that component rather than building it inline. To ensure the header integrates cleanly with the page layout, it pulls HEADER_HEIGHT, HEADER_HEIGHT_MD, and CONTAINER_WIDTH from the shared theme module, using these values to size itself responsively and align its content width with other sections of the page.

# Relations

- [Ctf Navigation Gql](ctf-navigation-gql.md) — Renders the site navigation menu {kind: sync}
- [Link](link.md) — Links the logo back to the homepage {kind: sync}
- [Theme](theme.md) — Uses shared header sizing and container width values {kind: sync}
- [Index Page](index-page.md) — Navigates users to the homepage {kind: sync}
