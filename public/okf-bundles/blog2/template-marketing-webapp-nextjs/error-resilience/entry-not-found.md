---
type: React Component
icon: fe-component.svg
title: Entry Not Found
description: EntryNotFound is the React component rendered when a visitor lands on a URL that doesn't match any page in the marketing webapp, giving them a clear signal that the requested content doesn't exist rather than a blank or broken screen.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_role: Presentational Component
---

To present this message, it relies on the shared ErrorBox component, delegating the actual layout and styling of the error state rather than building its own presentation from scratch.

# Relations

- [Error Box](error-box.md) — Displays the not-found message using the shared error box {kind: sync}
