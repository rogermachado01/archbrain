---
type: React Component
title: Ctf Person Gql
description: ctf-person-gql is the GraphQL-connected variant of the person component in this marketing web app template. Rather than accepting person data purely through props, it fetches its own content by calling a generated query hook, and then hands the resolved data off to the presentational CtfPerson component for rendering.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Content
ddd_role: Data Fetching Component
---

ctf-person-gql is the GraphQL-connected variant of the person component in this marketing web app template. Rather than accepting person data purely through props, it fetches its own content by calling a generated query hook, and then hands the resolved data off to the presentational CtfPerson component for rendering.

This split keeps data-fetching concerns separate from display logic: ctf-person-gql acts as a container that wires up the network request, while CtfPerson focuses solely on rendering the person's markup and styling. The generated query hook itself comes from a code-generation step tied to the underlying GraphQL schema, ensuring the shape of the fetched data stays in sync with the CMS content model.

# Relations

- [Ctf Person](ctf-person.md) — Passes fetched person data to the presentational component for rendering {kind: sync}
- [Ctf Person.Generated](ctf-person.generated.md) — Fetches person content via the generated GraphQL query hook {kind: sync}
