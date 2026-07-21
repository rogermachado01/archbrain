---
type: React Component
title: Ctf Business Info Gql
description: CtfBusinessInfoGql is the React component responsible for fetching and rendering Contentful-sourced business information within the marketing webapp's commerce section, sitting alongside other business-info-commerce building blocks. It pulls its data through the generated `useCtfBusinessInfoQuery` hook, meaning the query shape and fields are defined and codegen'd elsewhere, and this component's job is to consume that hook's result and translate it into UI.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

To handle the case where Contentful has no matching entry for the requested business info, the component defers to a shared `EntryNotFound` component rather than implementing its own not-found handling, keeping error presentation consistent across the app. It also reads from `useContentfulContext`, a shared context hook, to access whatever Contentful-related state (such as locale, preview mode, or entry identifiers) is needed to correctly issue the query and interpret its results.

# Relations

- [Business Info.Generated](business-info.generated.md) — Fetches business info data via the generated query hook {kind: sync}
- [Entry Not Found](../error-handling/entry-not-found.md) — Falls back to the not-found view when no entry exists {kind: sync}
- [Contentful Context](../generic-ui-utilities/contentful-context.md) — Reads shared Contentful context to drive the query {kind: sync}
