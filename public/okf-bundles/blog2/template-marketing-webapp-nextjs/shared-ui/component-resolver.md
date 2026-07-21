---
type: React Component
title: Component Resolver
description: ComponentResolver is a React component in the marketing webapp's shared UI layer responsible for resolving and rendering content based on Contentful data. It pulls context via useContentfulContext to determine how to render whatever content it's handed, acting as a bridge between raw Contentful entries and the actual React components displayed on the page.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Rich Content Rendering
ddd_role: Resolver Component
---

By depending on the Contentful context, ComponentResolver ties its rendering decisions to whatever preview/editing or delivery state that context exposes, rather than working with statically typed props alone. This makes it a central piece for pages that render dynamic, editor-driven content, since it's the point where Contentful data gets translated into concrete UI.

# Relations

- [Contentful Context](contentful-context.md) — Reads Contentful context to resolve which component to render {kind: sync}
