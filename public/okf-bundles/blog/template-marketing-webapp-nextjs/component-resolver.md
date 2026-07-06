---
type: React Component
title: Component Resolver
description: The Component Resolver is a React component responsible for dynamically resolving and rendering components within the marketing webapp template. As part of its operation, it draws on contextual data supplied through the Contentful context, allowing it to make rendering decisions informed by the current content state.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Content Rendering Infrastructure
ddd_role: Resolver Component
---

The Component Resolver is a React component responsible for dynamically resolving and rendering components within the marketing webapp template. As part of its operation, it draws on contextual data supplied through the Contentful context, allowing it to make rendering decisions informed by the current content state.

To access this context, the Component Resolver imports the useContentfulContext hook from the contentful-context module. This connects the resolver's rendering logic to the broader Contentful-driven content pipeline, ensuring that whatever content or preview state is active is available when determining how to resolve and display components.

# Relations

- [Contentful Context](contentful-context.md) — Reads live content state to guide component rendering {kind: sync}
