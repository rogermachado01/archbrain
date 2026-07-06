---
type: React Component
title: Ctf Person
description: CtfPerson is a React component responsible for rendering a person entity within the marketing web app template, such as an author, team member, or other individual profile referenced in the site's content. As a typed component, it relies on generated GraphQL typings to ensure the data it receives conforms to the expected shape.
level: component
owner: contentful/team-workflows
---

CtfPerson is a React component responsible for rendering a person entity within the marketing web app template, such as an author, team member, or other individual profile referenced in the site's content. As a typed component, it relies on generated GraphQL typings to ensure the data it receives conforms to the expected shape.

Specifically, CtfPerson imports the PersonFieldsFragment type from its generated file, which defines the structure of the person data (as fetched from Contentful) that the component expects to receive as props. This generated fragment acts as the contract between the content model and the component's rendering logic, allowing CtfPerson to safely consume and display person-related fields wherever it is used in the application.

# Relations

- [Ctf Person.Generated](ctf-person.generated.md) — Uses generated types to type the person data it renders {kind: sync}
