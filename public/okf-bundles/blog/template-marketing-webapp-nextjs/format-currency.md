---
type: React Component
title: Format Currency
description: format-currency is a React component within the marketing-webapp-nextjs template, responsible for rendering currency values in a locale- and preview-aware manner. It imports the useContentfulContext hook to access shared Contentful state, which allows the component to adjust its formatting behavior based on the current content context, such as locale settings that may be part of that shared state.
level: component
owner: contentful/team-workflows
---

format-currency is a React component within the marketing-webapp-nextjs template, responsible for rendering currency values in a locale- and preview-aware manner. It imports the useContentfulContext hook to access shared Contentful state, which allows the component to adjust its formatting behavior based on the current content context, such as locale settings that may be part of that shared state.

By relying on the Contentful context rather than requiring props to be manually threaded through, format-currency can be dropped into other components that render pricing or monetary values, ensuring consistent formatting throughout the marketing site wherever the Contentful context is available.

# Relations

- [Contentful Context](contentful-context.md) — Reads locale and content context to format currency values correctly {kind: sync}
