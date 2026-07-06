---
type: React Component
title: Author
description: `author` is a React Component within the `template-marketing-webapp-nextjs` template, part of the app's set of Contentful-driven (ctf) UI building blocks used to render marketing web pages. As an author-related component, it is responsible for presenting information about a person, such as a content author or contributor, within the page layout.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Content
ddd_role: Presentational Component
---

`author` is a React Component within the `template-marketing-webapp-nextjs` template, part of the app's set of Contentful-driven (ctf) UI building blocks used to render marketing web pages. As an author-related component, it is responsible for presenting information about a person, such as a content author or contributor, within the page layout.

To do this, it relies on the generated type `PersonFieldsFragment`, importing it from the `ctf-person` component's generated module. This fragment supplies the shape of the person data that Contentful returns, allowing `author` to consume and display author-related fields in a type-safe way as part of the broader ctf-components ecosystem.

# Relations

- [Ctf Person.Generated](ctf-person.generated.md) — Uses generated person field types to render author details {kind: sync}
