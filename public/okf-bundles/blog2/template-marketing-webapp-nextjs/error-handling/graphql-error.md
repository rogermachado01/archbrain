---
type: React Component
title: Graphql Error
description: GraphqlError is a React component in the marketing web app's error-handling layer, responsible for rendering a fallback UI when a GraphQL request fails. It gives the app a dedicated place to catch and display errors originating from the GraphQL data layer, rather than letting them surface as broken pages or unhandled exceptions.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

By isolating GraphQL-specific error presentation into its own component, the app can keep this concern separate from other error-handling paths (such as generic rendering or network errors), making it easier to reason about how GraphQL failures are surfaced to the user across the marketing site.
