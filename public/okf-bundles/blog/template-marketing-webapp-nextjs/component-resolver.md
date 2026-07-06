---
type: React Component
title: Component Resolver
description: The Component Resolver is a React component within the Next.js marketing webapp template responsible for dynamically resolving and rendering components based on content data, typically sourced from Contentful. To determine how content should be displayed, it relies on contextual information about the current Contentful setup, which it obtains by importing the useContentfulContext hook from the contentful-context module.
level: component
owner: contentful/team-workflows
---

The Component Resolver is a React component within the Next.js marketing webapp template responsible for dynamically resolving and rendering components based on content data, typically sourced from Contentful. To determine how content should be displayed, it relies on contextual information about the current Contentful setup, which it obtains by importing the useContentfulContext hook from the contentful-context module.

By consuming this context, the Component Resolver can access shared Contentful state or configuration needed to correctly map content entries to their corresponding React components. This makes it a central piece of the content-driven rendering pipeline, bridging raw content data with the appropriate UI components in the application.

# Relations

- [Contentful Context](contentful-context.md) — Reads Contentful context to resolve the correct component {kind: sync}
