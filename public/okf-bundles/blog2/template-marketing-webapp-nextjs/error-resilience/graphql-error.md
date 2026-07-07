---
type: React Component
icon: fe-component.svg
title: Graphql Error
description: GraphqlError is a shared UI component in the marketing web app's Next.js template that renders a fallback state when a GraphQL request fails, giving users a consistent error message wherever data fetching breaks down instead of a blank or broken screen.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_role: Error Formatting Utility
---

As a shared component, it lives outside any single page or route, meaning it's meant to be reused across the app wherever components fetch data via GraphQL. Any part of the marketing site that depends on GraphQL queries can drop this component in to handle the failure case uniformly, keeping error presentation consistent rather than each feature inventing its own error UI.
