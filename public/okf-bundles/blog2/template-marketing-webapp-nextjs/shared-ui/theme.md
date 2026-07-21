---
type: React Component
title: Theme
description: The `theme` component lives in the shared UI layer of the marketing web app template, providing theming support to pages rendered at the root route (`/`) and any dynamic slug-based route (`/[slug]`). As a React Component, it's positioned to be consumed wherever these pages need consistent visual styling or theme context.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Contentful Platform Infrastructure
ddd_role: Theming Utility Component
---

Because it's shared across both the homepage and dynamically generated content pages, this component acts as a common dependency rather than something tied to a single view. Any visitor navigating from the root landing page into a specific slug-based page would pass through parts of the app relying on this same theme setup, making it a foundational piece for visual consistency across the marketing site's primary navigation paths.
