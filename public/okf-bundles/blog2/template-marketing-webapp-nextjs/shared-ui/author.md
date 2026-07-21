---
type: React Component
title: Author
description: Author is a React component within the shared-ui layer of the marketing web app template, responsible for rendering author-related content such as bylines or attribution blocks that reference person data elsewhere in the app.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

It draws on the PersonFieldsFragment type generated from the ctf-person component's GraphQL definitions, indicating that Author displays or passes through structured person data (such as name, image, or bio fields) sourced from the Contentful-backed ctf-person feature component.

# Relations

- [Ctf Person](ctf-person.md) — Uses person field data shape for author attribution {kind: sync}
