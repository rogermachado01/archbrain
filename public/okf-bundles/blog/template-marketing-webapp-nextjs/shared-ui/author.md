---
type: React Component
title: Author
description: `author` is a shared React component in the marketing webapp template's UI layer, used to render author information wherever content needs attribution. It draws on person data shaped by the `PersonFieldsFragment`, which it imports from the generated types of the `ctf-person` component.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Person & Team
ddd_role: Presentational Component
---

By depending on `ctf-person`'s fragment for its person field shape rather than defining its own, `author` stays structurally aligned with how person data is fetched and typed elsewhere in the Contentful-driven component set, avoiding divergent duplicate definitions of what a "person" looks like across the UI.

# Relations

- [Ctf Person](ctf-person.md) — Reuses person field types from the ctf-person component {kind: sync}
