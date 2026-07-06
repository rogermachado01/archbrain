---
type: React Component
title: Ctf Person Gql
description: ctf-person-gql is a React component that acts as the data-fetching wrapper for the person feature in the Contentful-driven marketing site. Its role is to bridge the generated GraphQL query hook with the presentational component that renders a person's content, keeping data retrieval logic separate from rendering logic.
level: component
owner: contentful/team-workflows
---

ctf-person-gql is a React component that acts as the data-fetching wrapper for the person feature in the Contentful-driven marketing site. Its role is to bridge the generated GraphQL query hook with the presentational component that renders a person's content, keeping data retrieval logic separate from rendering logic.

It relies on a generated hook, useCtfPersonQuery, to execute the query needed to retrieve person data from the CMS. Once the data is available, it hands off rendering responsibilities to the CtfPerson component, which is imported from a sibling module and is responsible for actually displaying the person's information.

# Relations

- [Ctf Person](ctf-person.md) — Passes fetched person data to the presentational component for rendering {kind: sync}
- [Ctf Person.Generated](ctf-person.generated.md) — Fetches person data via the generated GraphQL query hook {kind: sync}
