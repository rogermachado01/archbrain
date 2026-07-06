---
type: React Component
title: Settings
description: The `settings` component acts as the container for the application's settings screen, delegating its actual form rendering to a dedicated `SettingsForm` component imported from the features layer.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Business Info & Settings
ddd_role: Presentational Component
---

By composing `SettingsForm` rather than implementing settings fields directly, this component keeps the page-level shell separate from the concrete settings UI logic, which lives in `@src/components/features/settings/settings-form`.

# Relations

- [Settings Form](settings-form.md) — Renders the settings form {kind: sync}
