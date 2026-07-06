---
type: React Component
title: Settings Form
description: SettingsForm is a React component within the marketing-webapp-nextjs template, responsible for rendering a form used to manage settings within the application. It relies on the Contentful context to access shared state or configuration relevant to the marketing app, drawing this context via the useContentfulContext hook.
level: component
owner: contentful/team-workflows
---

SettingsForm is a React component within the marketing-webapp-nextjs template, responsible for rendering a form used to manage settings within the application. It relies on the Contentful context to access shared state or configuration relevant to the marketing app, drawing this context via the useContentfulContext hook.

By importing useContentfulContext from the contentful-context module, SettingsForm can read whatever contextual values that hook exposes, allowing it to tailor its rendered form or behavior according to the current Contentful-related state established elsewhere in the template. This positions SettingsForm as a consumer of shared context rather than a source of it, integrating into the broader app structure by depending on centrally managed context data.

# Relations

- [Contentful Context](contentful-context.md) — Reads shared Contentful context to inform the settings form {kind: sync}
