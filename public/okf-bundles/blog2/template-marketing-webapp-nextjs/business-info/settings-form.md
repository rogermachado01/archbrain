---
type: React Component
icon: fe-component.svg
title: Settings Form
description: SettingsForm is a React component within the shared-ui layer of the Next.js marketing webapp template, responsible for rendering a form used to manage settings within the app. It draws on the Contentful context to access data or configuration needed to populate or drive its form fields.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_role: Form Component
---

By importing `useContentfulContext` from the contentful-context module, SettingsForm ties its rendering to whatever content or configuration state that context exposes, letting it stay in sync with Contentful-backed data rather than managing that state independently.

# Relations

- [Contentful Context](../content-rendering/contentful-context.md) — Reads Contentful context data to populate the settings form {kind: sync}
