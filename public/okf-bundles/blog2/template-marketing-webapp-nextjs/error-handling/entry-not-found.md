---
type: React Component
title: Entry Not Found
description: EntryNotFound is a React component that handles the case where a requested entry — a page, post, or other content item — cannot be located in the marketing webapp. It's the component developers reach for when a lookup fails, giving visitors a clear signal instead of a broken or blank page.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

To communicate the failure, it relies on ErrorBox, imported from the shared components directory, to render the actual error presentation. This keeps EntryNotFound focused on the "entry not found" scenario specifically, while delegating the visual and structural details of displaying an error to the shared ErrorBox component.

# Relations

- [Error Box](error-box.md) — Displays the not-found error via the shared error box {kind: sync}
