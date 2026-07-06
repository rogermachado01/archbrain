---
type: React Component
title: Entry Not Found
description: EntryNotFound is a React component within the marketing web app template, intended to represent a not-found or missing-entry state within the application. It relies on the ErrorBox component to render its content, indicating that this component is a specialized wrapper that presents error or empty-state messaging to the user in a consistent, shared visual format.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Error Handling
ddd_role: Presentational Component
---

EntryNotFound is a React component within the marketing web app template, intended to represent a not-found or missing-entry state within the application. It relies on the ErrorBox component to render its content, indicating that this component is a specialized wrapper that presents error or empty-state messaging to the user in a consistent, shared visual format.

By composing ErrorBox rather than building its own presentation, EntryNotFound keeps the not-found experience aligned with other error states across the app, delegating the actual layout and styling of the message to the shared component.

# Relations

- [Error Box](error-box.md) — Displays the not-found message using the shared error box {kind: sync}
