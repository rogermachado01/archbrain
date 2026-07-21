---
type: React Component
title: Settings Form
description: SettingsForm is a React component in the marketing web app's settings and preferences area, responsible for rendering the interface users interact with to view or update their preferences within the app.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

To do so, it relies on useContentfulContext, imported from the generic Contentful context utility, which suggests the form's structure or content (such as labels, options, or copy) is driven by data sourced from Contentful rather than hardcoded, allowing the settings experience to be managed as content.

# Relations

- [Contentful Context](../generic-ui-utilities/contentful-context.md) — Reads shared Contentful context to populate form content {kind: sync}
