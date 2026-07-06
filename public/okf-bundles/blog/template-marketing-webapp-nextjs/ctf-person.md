---
type: React Component
title: Ctf Person
description: `ctf-person` is a React component responsible for rendering a person entity within the marketing web app template, most likely used to display author bios, team member profiles, or similar people-related content sourced from Contentful. It relies on generated GraphQL typings to ensure the shape of the person data it receives matches what the CMS provides.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Content
ddd_role: Presentational Component
---

`ctf-person` is a React component responsible for rendering a person entity within the marketing web app template, most likely used to display author bios, team member profiles, or similar people-related content sourced from Contentful. It relies on generated GraphQL typings to ensure the shape of the person data it receives matches what the CMS provides.

Specifically, the component imports the `PersonFieldsFragment` type from its generated code file, which defines the structure of the person data fields (such as name, image, or role) that the component expects as props. This keeps the component's data contract in sync with the underlying Contentful content model, reducing the risk of runtime errors from mismatched data shapes.

# Relations

- [Ctf Person.Generated](ctf-person.generated.md) — Type-checks person props against the generated Contentful fragment {kind: sync}
