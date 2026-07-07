---
type: React Component
icon: fe-design-system.svg
title: Theme
description: `theme` is a shared React component in the marketing web app template, providing the theming layer used across the site's pages. It appears on both the home route (`/`) and dynamic content routes (`/[slug]`), indicating it's part of the common shell rendered regardless of which page a visitor lands on.
level: container
owner: contentful/team-workflows
---

It functions as cross-cutting presentation infrastructure rather than page-specific content — the kind of module that wraps or informs styling for whatever route-level content is rendered inside it. Its presence on both the root route and the catch-all slug route suggests it's wired in at a layout level common to the app's page tree, rather than included ad hoc per page. Promoted to a standalone container (rather than a component nested under one arbitrary capability) because nearly every other capability depends on it directly for shared design tokens (spacing, color palette, breakpoints) — modeling it as a small leaf container, the same way "Design System" is modeled in the Loja Web reference bundle, makes that site-wide dependency explicit.
