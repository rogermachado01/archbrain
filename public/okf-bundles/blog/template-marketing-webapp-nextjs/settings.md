---
type: React Component
title: Settings
description: `settings` is a React component in the marketing web app template, serving as the page-level entry point for the settings section of the site. Its role is to compose the settings experience by bringing in the dedicated form component responsible for handling the actual settings inputs and interactions.
level: component
owner: contentful/team-workflows
---

`settings` is a React component in the marketing web app template, serving as the page-level entry point for the settings section of the site. Its role is to compose the settings experience by bringing in the dedicated form component responsible for handling the actual settings inputs and interactions.

This component imports `SettingsForm` from the features/settings module, delegating the rendering and behavior of the settings interface to that component. This keeps the `settings` concept itself focused on page-level composition, while the form logic and fields live in `SettingsForm`.

# Relations

- [Settings Form](settings-form.md) — Renders the settings form {kind: sync}
