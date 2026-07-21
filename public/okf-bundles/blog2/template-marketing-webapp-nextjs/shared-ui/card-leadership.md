---
type: React Component
title: Card Leadership
description: "CardLeadership is a React component in the shared UI layer used to present a person profile card, most likely for team, leadership, or \"about us\" style sections of the marketing site. It composes three other shared components to assemble its content: an asset renderer for imagery, a person fragment for structured profile data, and a rich text renderer for freeform descriptive copy."
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

By relying on `PersonFieldsFragment` for its data shape, CardLeadership is tied directly to whatever content model Contentful exposes for person entries, meaning any change to that generated fragment surfaces here. Its use of `CtfAsset` and `CtfRichtext` shows it's built to slot into the broader Contentful-driven component ecosystem rather than rendering static or hardcoded content, keeping it consistent with how other Ctf-prefixed components handle CMS-sourced media and text.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders the person's photo or media asset {kind: sync}
- [Ctf Person](ctf-person.md) — Supplies the structured profile data for the card {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the person's bio or descriptive text {kind: sync}
