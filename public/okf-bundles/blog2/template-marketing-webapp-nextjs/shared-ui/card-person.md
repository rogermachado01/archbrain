---
type: React Component
title: Card Person
description: card-person is a shared UI component used to display a person's profile, consuming data shaped by the PersonFieldsFragment type imported from ctf-person. It renders rich text content via the CtfRichtext component, allowing structured text fields such as a bio or description to be displayed alongside the person's other details.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

Within the shared-ui layer, card-person acts as a presentational building block that other parts of the app (such as team or author listings) can compose with, relying on ctf-person for its data contract and ctf-richtext for formatted text rendering.

# Relations

- [Ctf Person](ctf-person.md) — Consumes person data fields for display {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders formatted bio or description text {kind: sync}
