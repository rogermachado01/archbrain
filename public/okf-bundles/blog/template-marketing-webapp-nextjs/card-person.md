---
type: React Component
title: Card Person
description: card-person is a React component in the marketing web app template responsible for rendering a person's card, likely as part of a team or contributor listing. It relies on generated types to know the shape of the person data it receives, and it delegates rendering of any rich text content associated with the person—such as a bio or description—to a dedicated rich text component.
level: component
owner: contentful/team-workflows
---

card-person is a React component in the marketing web app template responsible for rendering a person's card, likely as part of a team or contributor listing. It relies on generated types to know the shape of the person data it receives, and it delegates rendering of any rich text content associated with the person—such as a bio or description—to a dedicated rich text component.

By composing the CtfRichtext component, card-person keeps its own responsibilities focused on the card's structure and layout, while the formatting and rendering of long-form content is handled elsewhere. This separation lets the rich text component be reused consistently across other parts of the site that also need to display Contentful-sourced rich text.

# Relations

- [Ctf Person.Generated](ctf-person.generated.md) — Types the person data used to populate the card {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the person's rich text bio within the card {kind: sync}
