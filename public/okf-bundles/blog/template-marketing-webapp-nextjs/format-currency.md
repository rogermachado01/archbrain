---
type: React Component
title: Format Currency
description: `format-currency` is a React component belonging to the marketing web app template, responsible for presenting currency values in the UI. As part of its rendering logic, it relies on the shared Contentful context to access data needed to display formatted currency correctly within the page.
level: component
owner: contentful/team-workflows
---

`format-currency` is a React component belonging to the marketing web app template, responsible for presenting currency values in the UI. As part of its rendering logic, it relies on the shared Contentful context to access data needed to display formatted currency correctly within the page.

It imports `useContentfulContext` from `@src/contentful-context`, meaning it participates in the broader Contentful-driven content pipeline used across the template, drawing on whatever contextual data that hook exposes rather than managing its own state.

# Relations

- [Contentful Context](contentful-context.md) — Reads shared Contentful context to help format currency values {kind: sync}
