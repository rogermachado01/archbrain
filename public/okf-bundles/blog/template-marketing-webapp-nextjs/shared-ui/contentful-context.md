---
type: React Component
title: Contentful Context
description: ContentfulContext is a React component that supplies Contentful-sourced data to the shared UI layer used on the home route (`/`) and dynamic content routes (`/[slug]`), making it a common dependency wherever page content is rendered from Contentful.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Contentful Content Rendering
ddd_role: Context Provider
---

Because it's shared across both the root route and the catch-all slug route, this component acts as the connective layer between whatever page-level data fetching occurs for a given URL and the presentational components that consume that data further down the tree, ensuring both route types have consistent access to the same content context.
