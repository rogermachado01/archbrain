---
type: React Component
title: Settings
description: This component represents the settings page within the marketing web app template, built with Next.js. As a React Component, it serves as the entry point for rendering the settings experience within the application's routing structure.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Settings
ddd_role: Presentational Component
---

This component represents the settings page within the marketing web app template, built with Next.js. As a React Component, it serves as the entry point for rendering the settings experience within the application's routing structure.

Its primary responsibility is to compose the settings screen by bringing in the SettingsForm component, which handles the actual settings interface presented to the user. This keeps the page-level component focused on layout and composition, while delegating the form logic and fields to the imported component.

# Relations

- [Settings Form](settings-form.md) — Renders the settings form for the page {kind: sync}
