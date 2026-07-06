---
type: React Component
title: Card Person
description: card-person is a React component used to render a person's profile information within the marketing web app. It relies on the `PersonFieldsFragment` type to type-check the shape of person data it receives, ensuring the component works with the fields defined for a person entry from the content source.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Content
ddd_role: Presentational Component
---

card-person is a React component used to render a person's profile information within the marketing web app. It relies on the `PersonFieldsFragment` type to type-check the shape of person data it receives, ensuring the component works with the fields defined for a person entry from the content source.

To display richer text content associated with a person, such as a biography or description, card-person delegates rendering to the CtfRichtext component. This allows the card to present formatted rich text alongside the person's other details in a consistent way with the rest of the site's content rendering.

# Relations

- [Ctf Person.Generated](ctf-person.generated.md) — Types the person data shown on the card {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the person's rich text description {kind: sync}
