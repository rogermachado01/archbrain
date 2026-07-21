---
type: React Component
title: Author
description: The `author` component belongs to the Contentful content blocks feature set of the Next.js marketing webapp template, representing an author entity as it's authored and rendered from Contentful-managed content.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Cards
ddd_role: Presentational Component
---

It depends on the generated `PersonFieldsFragment` type from the `ctf-person` component, indicating that author data is structured around a shared person schema, likely reused wherever a named individual (such as a blog post writer or team member) needs to be displayed with consistent fields.

# Relations

- [Ctf Person](ctf-person.md) — Uses person data fields to render author information {kind: sync}
