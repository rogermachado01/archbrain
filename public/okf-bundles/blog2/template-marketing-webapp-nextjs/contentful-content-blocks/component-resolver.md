---
type: React Component
title: Component Resolver
description: The component-resolver is a React component within the Contentful content blocks module that maps content entries to their corresponding React components for rendering on the page. It relies on the Contentful context to determine what content is currently active or being edited, allowing it to select and render the correct block component dynamically as a visitor or editor navigates the marketing site.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Page Composition
ddd_role: Component Resolver
---

By pulling context through useContentfulContext, the resolver stays aware of the surrounding Contentful state without owning that state itself, keeping the resolution logic focused purely on matching content types to components.

# Relations

- [Contentful Context](../generic-ui-utilities/contentful-context.md) — Reads Contentful context to resolve the correct block component {kind: sync}
