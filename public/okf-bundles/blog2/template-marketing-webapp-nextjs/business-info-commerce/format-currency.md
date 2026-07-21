---
type: React Component
title: Format Currency
description: format-currency is a React component within the business-info-commerce group of this Next.js marketing web app template, responsible for rendering currency values in a locale- or business-appropriate format wherever pricing or monetary figures need to be displayed.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

To do this, it draws on `useContentfulContext` from the generic-ui-utilities group, pulling in Contentful-driven context (such as locale or content configuration) so that the formatted currency output can reflect settings sourced from the CMS rather than being hardcoded.

# Relations

- [Contentful Context](../generic-ui-utilities/contentful-context.md) — Reads Contentful context to inform currency formatting {kind: sync}
