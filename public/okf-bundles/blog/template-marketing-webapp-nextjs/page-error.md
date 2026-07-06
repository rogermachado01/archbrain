---
type: React Component
title: Page Error
description: page-error is a React component within the template-marketing-webapp-nextjs template, responsible for rendering the error state of the application's pages. It draws on the shared theme configuration to ensure that when an error is displayed to visitors, it maintains visual consistency with the rest of the marketing site rather than appearing as a jarring, unstyled fallback.
level: component
owner: contentful/team-workflows
---

page-error is a React component within the template-marketing-webapp-nextjs template, responsible for rendering the error state of the application's pages. It draws on the shared theme configuration to ensure that when an error is displayed to visitors, it maintains visual consistency with the rest of the marketing site rather than appearing as a jarring, unstyled fallback.

By pulling in colorfulTheme, this component ties its presentation to the same design system used elsewhere in the app, allowing error messaging to inherit consistent colors and styling choices defined centrally in the theme module.

# Relations

- [Theme](theme.md) — Styles the error page using the shared theme {kind: sync}
