---
type: React Component
title: Contentful Context
description: ContentfulContext is a React component in the marketing webapp template that provides Contentful-related data and functionality to the components beneath it in the component tree. As a context provider, it wraps portions of the application to make Contentful content or configuration available to descendant components without requiring props to be passed down manually through every intermediate layer.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Contentful Integration
ddd_role: Context Provider
---

ContentfulContext is a React component in the marketing webapp template that provides Contentful-related data and functionality to the components beneath it in the component tree. As a context provider, it wraps portions of the application to make Contentful content or configuration available to descendant components without requiring props to be passed down manually through every intermediate layer.

In practice, this component would be used near the root of a page or layout, allowing any nested component that needs access to Contentful data to consume it directly from the context rather than relying on prop drilling. This pattern centralizes the connection to Contentful within the marketing webapp architecture, keeping the data source accessible in a consistent way across the component tree.
