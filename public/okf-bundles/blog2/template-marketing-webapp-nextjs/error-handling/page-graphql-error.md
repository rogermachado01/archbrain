---
type: React Component
title: Page Graphql Error
description: page-graphql-error is a React component in the marketing web app's error-handling module, rendered on a page-level basis to present GraphQL errors to the user. It relies on the shared GraphqlError component to do the actual rendering work, keeping the page component itself focused on wiring the error state into the display rather than defining its own error presentation logic.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

By delegating to GraphqlError, this page-level component ensures that GraphQL failures encountered while loading a page are shown consistently with however GraphQL errors are handled elsewhere in the app, without duplicating markup or styling for the error state.

# Relations

- [Graphql Error](graphql-error.md) — Displays GraphQL errors using the shared error component {kind: sync}
