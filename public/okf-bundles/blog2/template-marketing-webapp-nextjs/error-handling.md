---
type: UI Capability
title: Error Handling
description: Error Handling is a UI capability within the marketing webapp template responsible for presenting error states to users as they navigate the app, keeping failures visually consistent with the rest of the site rather than dropping users into a bare, unstyled screen.
level: container
icon: fe-design-system.svg
ddd_subdomain: generic
ddd_context: Platform Utilities
ddd_role: Error Boundary Component
---

It relies on the generic UI utilities module, which supplies the colorfulTheme from the shared theme source, so that error views inherit the same visual language (colors, styling) used elsewhere in the application.

# Relations

- [Generic Ui Utilities](generic-ui-utilities.md) — Styles error screens with the shared color theme {kind: sync}
