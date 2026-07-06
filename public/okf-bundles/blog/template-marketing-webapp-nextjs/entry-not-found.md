---
type: React Component
title: Entry Not Found
description: EntryNotFound is a React component belonging to the Next.js marketing web app template, used to represent a not-found or missing-entry state within the application. It relies on the ErrorBox component to present this state to the user in a consistent, styled manner.
level: component
owner: contentful/team-workflows
---

EntryNotFound is a React component belonging to the Next.js marketing web app template, used to represent a not-found or missing-entry state within the application. It relies on the ErrorBox component to present this state to the user in a consistent, styled manner.

By composing ErrorBox rather than implementing its own error presentation, EntryNotFound stays focused on signaling the specific "entry not found" condition while delegating the visual and structural details of error display to a shared component.

# Relations

- [Error Box](error-box.md) — Displays a not-found message using the shared error box {kind: sync}
