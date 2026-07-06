---
type: React Component
title: Ctf Person
description: CtfPerson is a React component responsible for rendering a person entity within the marketing web app template, such as an author, team member, or other individual profile represented in the content model. It relies on a generated GraphQL fragment type, PersonFieldsFragment, to type the shape of the person data it receives as props, ensuring consistency between the component's expectations and the underlying Contentful schema.
level: component
owner: contentful/team-workflows
---

CtfPerson is a React component responsible for rendering a person entity within the marketing web app template, such as an author, team member, or other individual profile represented in the content model. It relies on a generated GraphQL fragment type, PersonFieldsFragment, to type the shape of the person data it receives as props, ensuring consistency between the component's expectations and the underlying Contentful schema.

By importing this fragment type from its generated code file, CtfPerson stays aligned with the content structure defined for "Person" entries, allowing it to safely destructure and display fields associated with a person without needing to manually redefine or guess the shape of that data.

# Relations

- [Ctf Person.Generated](ctf-person.generated.md) — Types its incoming person data with the generated fragment {kind: sync}
