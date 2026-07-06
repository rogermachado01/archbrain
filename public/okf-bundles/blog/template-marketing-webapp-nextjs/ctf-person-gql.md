---
type: React Component
title: Ctf Person Gql
description: ctf-person-gql is a React component in the marketing web app template that acts as a GraphQL-connected wrapper around the presentational CtfPerson component. It sources its data by calling the generated useCtfPersonQuery hook, which encapsulates the query logic for fetching person-related content from Contentful, and then passes the resulting data through to CtfPerson for rendering.
level: component
owner: contentful/team-workflows
---

ctf-person-gql is a React component in the marketing web app template that acts as a GraphQL-connected wrapper around the presentational CtfPerson component. It sources its data by calling the generated useCtfPersonQuery hook, which encapsulates the query logic for fetching person-related content from Contentful, and then passes the resulting data through to CtfPerson for rendering.

This separation reflects a common pattern in the template: keeping data-fetching concerns (via the generated GraphQL hook) distinct from presentation concerns (handled by CtfPerson). ctf-person-gql serves as the integration point between these two layers, making it the piece other parts of the app would use when they need a fully data-populated person component rather than assembling the query and presentation separately.

# Relations

- [Ctf Person](ctf-person.md) — Renders the fetched person data {kind: sync}
- [Ctf Person.Generated](ctf-person.generated.md) — Fetches person data via generated query hook {kind: sync}
