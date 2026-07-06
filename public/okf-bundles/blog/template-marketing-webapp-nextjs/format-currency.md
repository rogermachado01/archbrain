---
type: React Component
title: Format Currency
description: `format-currency` is a React component within the marketing web app template that is responsible for rendering currency values in a display-ready format. As part of its implementation, it draws on the app's Contentful context to access content-driven configuration, allowing formatting behavior to reflect settings sourced from Contentful rather than being hardcoded.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Formatting Utilities
ddd_role: Utility Component
---

`format-currency` is a React component within the marketing web app template that is responsible for rendering currency values in a display-ready format. As part of its implementation, it draws on the app's Contentful context to access content-driven configuration, allowing formatting behavior to reflect settings sourced from Contentful rather than being hardcoded.

By consuming `useContentfulContext`, the component can adapt its output — such as currency symbols, locale conventions, or related presentation details — based on the surrounding content context rather than requiring this information to be passed in independently. This makes `format-currency` a small, focused utility component intended to be used wherever monetary values need consistent, context-aware formatting across the marketing site.

# Relations

- [Contentful Context](contentful-context.md) — Reads content configuration to inform currency formatting {kind: sync}
