---
type: React Component
icon: fe-component.svg
title: Page Error
description: page-error is a React component in the marketing web app's shared UI layer, rendering the error state a visitor encounters when something goes wrong on a page. It draws its visual identity from the app's shared theming so error screens stay consistent with the rest of the site rather than looking like a broken, unstyled page.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_role: Presentational Component
---

The component pulls in colorfulTheme from the shared theme module, tying its presentation to the same design tokens used elsewhere in the app, rather than defining its own ad hoc styles.

# Relations

- [Theme](../theme.md) — Applies the shared colorful theme styling to the error page {kind: sync}
