---
type: React Component
title: Author
description: `author` is a React Component within the `template-marketing-webapp-nextjs` template, representing the marketing web app's approach to modeling and rendering author-related information. As a component in this architecture, it participates in the broader system of Contentful-driven components used to assemble marketing pages.
level: component
owner: contentful/team-workflows
---

`author` is a React Component within the `template-marketing-webapp-nextjs` template, representing the marketing web app's approach to modeling and rendering author-related information. As a component in this architecture, it participates in the broader system of Contentful-driven components used to assemble marketing pages.

Its known connection is to the generated types module for the `ctf-person` component, from which it imports `PersonFieldsFragment`. This suggests that `author` relies on the shape of person data defined for `ctf-person` to represent or display author information consistently with how person entities are modeled elsewhere in the template.

# Relations

- [Ctf Person.Generated](ctf-person.generated.md) — Uses person field types to represent author data {kind: sync}
