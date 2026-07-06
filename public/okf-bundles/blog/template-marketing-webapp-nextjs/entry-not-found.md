---
type: React Component
title: Entry Not Found
description: EntryNotFound is a React component in the Next.js marketing web app template, intended to represent a not-found state for an entry within the application. It relies on the shared ErrorBox component to present its content, delegating the visual and structural aspects of error messaging to that shared component rather than defining its own presentation from scratch.
level: component
owner: contentful/team-workflows
---

EntryNotFound is a React component in the Next.js marketing web app template, intended to represent a not-found state for an entry within the application. It relies on the shared ErrorBox component to present its content, delegating the visual and structural aspects of error messaging to that shared component rather than defining its own presentation from scratch.

By composing ErrorBox, EntryNotFound fits into the app's broader pattern of using shared UI primitives for consistent error and empty-state handling across the marketing site.

# Relations

- [Error Box](error-box.md) — Displays a not-found message using the shared error box {kind: sync}
