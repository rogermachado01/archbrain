---
type: UI Capability
title: Settings Preferences
description: Settings & Preferences is a UI capability in the marketing webapp template that lets the app read Contentful-driven configuration to shape what's shown to visitors, tying content management state into the rendering layer rather than hardcoding it.
level: container
icon: fe-design-system.svg
ddd_subdomain: supporting
ddd_context: Platform Utilities
ddd_role: Settings Provider
---

To do this, it pulls in the Contentful context hook from the template's generic UI utilities, giving it access to the shared Contentful state without duplicating context-setup logic elsewhere in the app.

# Relations

- [Generic Ui Utilities](generic-ui-utilities.md) — Reads Contentful context to drive settings state {kind: sync}
