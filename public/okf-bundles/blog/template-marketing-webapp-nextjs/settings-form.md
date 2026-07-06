---
type: React Component
title: Settings Form
description: SettingsForm is a React component within the marketing webapp template that provides a form-based interface for managing settings, likely tied to the app's Contentful-driven configuration. It relies on shared context to access the current Contentful setup, allowing the form to reflect or update values relevant to the connected space and environment.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Settings
ddd_role: Form Component
---

SettingsForm is a React component within the marketing webapp template that provides a form-based interface for managing settings, likely tied to the app's Contentful-driven configuration. It relies on shared context to access the current Contentful setup, allowing the form to reflect or update values relevant to the connected space and environment.

By consuming the Contentful context, SettingsForm can operate within the broader app-building flow, where users configure how content is sourced and rendered. This positions it as a supporting UI piece for administrators or developers adjusting integration settings rather than a content-facing component.

# Relations

- [Contentful Context](contentful-context.md) — Reads Contentful connection details from shared context {kind: sync}
