---
type: React Component
title: Settings
description: Settings is the React component behind the app's settings surface, composing the SettingsForm from the shared features layer to render the actual editable fields and controls. It acts as a thin wrapper or page-level container, delegating the form logic and layout to the imported component rather than implementing settings behavior itself.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Business Info & Settings
ddd_role: Presentational Component
---

By pulling in SettingsForm rather than duplicating it, this component keeps the settings screen aligned with a single shared implementation used elsewhere in the features directory, so any changes to form fields or validation propagate here automatically.

# Relations

- [Settings Form](settings-form.md) — Renders the settings form fields and controls {kind: sync}
