---
type: React Component
title: Entry Not Found
description: EntryNotFound is a React component that serves as the not-found view within the shared UI layer of the marketing webapp template, rendered whenever a visitor navigates to a route that doesn't resolve to existing content.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Error Handling
ddd_role: Presentational Component
---

To communicate the missing-page state, it delegates its visual presentation to ErrorBox, importing it from the shared components directory rather than building its own error layout.

# Relations

- [Error Box](error-box.md) — Displays the error message via ErrorBox {kind: sync}
