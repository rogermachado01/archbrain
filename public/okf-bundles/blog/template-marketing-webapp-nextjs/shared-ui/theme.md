---
type: React Component
title: Theme
description: `theme` is a shared React component in the marketing web app template, providing the theming layer used across the site's pages. It appears on both the home route (`/`) and dynamic content routes (`/[slug]`), indicating it's part of the common shell rendered regardless of which page a visitor lands on.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Generic Utilities
ddd_role: Theme Provider
---

Because it's scoped under `shared-ui`, it functions as cross-cutting presentation infrastructure rather than page-specific content — the kind of component that wraps or informs styling for whatever route-level content is rendered inside it. Its presence on both the root route and the catch-all slug route suggests it's wired in at a layout level common to the app's page tree, rather than included ad hoc per page.
