---
type: React Component
title: Component Resolver
description: The component-resolver is a React component within the marketing web app template, responsible for determining which component to render based on content data. As part of its rendering logic, it relies on the Contentful context to access shared state or configuration relevant to the current preview or content environment.
level: component
owner: contentful/team-workflows
---

The component-resolver is a React component within the marketing web app template, responsible for determining which component to render based on content data. As part of its rendering logic, it relies on the Contentful context to access shared state or configuration relevant to the current preview or content environment.

It imports the useContentfulContext hook from the contentful-context module, indicating that its resolution behavior is aware of, or responsive to, the surrounding Contentful integration—likely to support features such as live preview or content-driven rendering decisions.

# Relations

- [Contentful Context](contentful-context.md) — Reads Contentful context to inform component resolution {kind: sync}
