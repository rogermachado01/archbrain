---
type: React Component
title: Card Person
description: CardPerson renders an individual person entry within the Contentful content-block system, presenting profile data alongside formatted body copy for a single team member, author, or contact featured on a marketing page.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Cards
ddd_role: Presentational Component
---

It relies on PersonFieldsFragment, the generated type shape produced from the ctf-person GraphQL fragment, to type the fields it receives — name, role, or bio data associated with a person entry. For any long-form descriptive text on the card, it defers to CtfRichtext, which handles the rendering of Contentful's rich text structure into formatted output, keeping CardPerson focused on layout while richtext parsing stays centralized.

# Relations

- [Ctf Person](ctf-person.md) — Types the card's person fields from the ctf-person fragment {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within the person card {kind: sync}
