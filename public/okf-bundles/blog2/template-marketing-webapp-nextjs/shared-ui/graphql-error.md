---
type: React Component
title: Graphql Error
description: GraphqlError is a shared UI component that renders a fallback message when a GraphQL request fails, giving users a consistent visual indication that data could not be loaded rather than leaving a broken or blank section of the page.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Error Handling
ddd_role: Presentational Component
---

Because it lives in the shared-ui layer, it's meant to be reused across any part of the marketing webapp that fetches data via GraphQL, wherever a query might error out. Placing this responsibility in a dedicated component keeps error-state presentation consistent and decoupled from the individual pages or features that trigger the underlying queries.
