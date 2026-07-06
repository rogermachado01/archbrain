---
type: React Component
title: Component Resolver
description: The component-resolver in shared-ui is a React component responsible for resolving and rendering content dynamically, drawing on Contentful context to determine what should be displayed at a given point in the page tree.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Contentful Content Rendering
ddd_role: Component Resolver
---

It imports `useContentfulContext` from `@src/contentful-context`, tying its resolution logic to the surrounding Contentful data context rather than operating in isolation. This dependency suggests the resolver consults contextual Contentful state to decide how to map content entries to their corresponding rendered components.

# Relations

- [Contentful Context](contentful-context.md) — Reads Contentful context to resolve which component to render {kind: sync}
