---
type: React Component
title: Settings Form
description: SettingsForm is a React component within the shared-ui layer of the marketing webapp template, responsible for rendering form controls that let a user or editor adjust settings tied to the site's content configuration. It relies on the Contentful context to access the underlying content data and preview state needed to populate or update its fields.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Business Info & Settings
ddd_role: Form Component
---

By importing `useContentfulContext` from `@src/contentful-context`, this component taps into whatever Contentful-related state and helpers that context exposes, rather than fetching or managing content data on its own. This keeps SettingsForm focused on presentation and user input handling while delegating content-source concerns to the shared context provider.

# Relations

- [Contentful Context](contentful-context.md) — Reads Contentful state via the shared context hook {kind: sync}
