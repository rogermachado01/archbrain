---
type: React Component
title: Card Person
description: card-person is a React component in the marketing web app template responsible for rendering a person entity, such as a team member or author profile, within the page layout. It relies on typed content shaped by the PersonFieldsFragment, which defines the structure of the Contentful person data it consumes, ensuring the component receives consistently formatted fields to display.
level: component
owner: contentful/team-workflows
---

card-person is a React component in the marketing web app template responsible for rendering a person entity, such as a team member or author profile, within the page layout. It relies on typed content shaped by the PersonFieldsFragment, which defines the structure of the Contentful person data it consumes, ensuring the component receives consistently formatted fields to display.

To present descriptive or biographical content associated with the person, card-person delegates rendering of rich text fields to the ctf-richtext component. This allows the card to display formatted text content, such as a bio or description, using the shared rich text rendering logic rather than duplicating that behavior locally.

# Relations

- [Ctf Person.Generated](ctf-person.generated.md) — Consumes typed person data fields for display {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the person's rich text description {kind: sync}
