---
type: React Component
title: Settings
description: Settings sits in the settings-preferences section of the marketing web app, serving as the component that assembles the user-facing settings screen. It delegates the actual form rendering to SettingsForm, keeping this component focused on composing the page around that form.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

By importing SettingsForm from the features/settings directory, Settings acts as a thin wrapper or page-level shell, pulling in the reusable form component rather than implementing settings fields itself. This separation lets the form logic live independently under components/features/settings while Settings handles placement within the settings-preferences page.

# Relations

- [Settings Form](settings-form.md) — Renders the settings form for the user to edit preferences {kind: sync}
