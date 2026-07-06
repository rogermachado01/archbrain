---
type: React Component
title: Card Leadership
description: CardLeadership is a React component in the shared UI layer that renders a single leadership profile card, combining a person's photo, biographical details, and descriptive text into one presentational unit. It draws on CtfAsset to display the associated image, CtfPerson's generated fields to supply the person's data, and CtfRichtext to render accompanying formatted copy such as a bio or title.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Person & Team
ddd_role: Presentational Component
---

Within the marketing site's component architecture, this card is the building block for team or leadership listing sections, letting content editors populate structured Contentful entries that get translated into a consistent visual layout wherever leadership is showcased on the page.

# Relations

- [Ctf Asset](ctf-asset.md) — Displays the leader's photo {kind: sync}
- [Ctf Person](ctf-person.md) — Supplies the leader's profile data {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the leader's bio text {kind: sync}
