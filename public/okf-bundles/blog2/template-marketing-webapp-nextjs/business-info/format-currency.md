---
type: React Component
icon: fe-component.svg
title: Format Currency
description: format-currency is a React component in the shared-ui layer of the marketing web app template, responsible for rendering currency values consistently wherever prices or monetary figures appear across the site's pages.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_role: Formatting Utility Component
---

To do so, it pulls locale and formatting context from the Contentful integration layer, calling useContentfulContext so that currency output can adapt to the content configuration supplied by Contentful rather than being hardcoded.

# Relations

- [Contentful Context](../content-rendering/contentful-context.md) — Reads locale/formatting context to render currency correctly {kind: sync}
