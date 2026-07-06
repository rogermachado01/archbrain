---
type: React Component
title: Card Person
description: card-person is a shared UI component for displaying a person's profile within the marketing site, consuming a `PersonFieldsFragment` shaped by the ctf-person feature component and rendering rich text content through the shared ctf-richtext component. It's used wherever the app needs to present a person card, such as author bios or team member listings, pairing structured contentful person data with formatted body copy.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Person & Team
ddd_role: Presentational Component
---

The component sits at the boundary between Contentful-sourced feature data and generic presentational rendering: it takes the typed fields fragment produced upstream and delegates any rich-text field within it to ctf-richtext for formatting, keeping the card itself focused on layout and presentation rather than data-fetching or content-parsing logic.

# Relations

- [Ctf Person](ctf-person.md) — Consumes person data shape from ctf-person {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders rich text fields via ctf-richtext {kind: sync}
