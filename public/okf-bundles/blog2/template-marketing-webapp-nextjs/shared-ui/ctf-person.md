---
type: React Component
title: Ctf Person
description: ctf-person is a React component in the marketing web app's shared UI layer, representing content-modeled "person" data (such as an author or team member) sourced from Contentful. It is used wherever the app needs to render person-related information built from Contentful entries.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

To display any image associated with a person, such as a profile photo or headshot, ctf-person relies on the ctf-asset module, pulling in its generated fragment type and document so that asset data conforms to the expected shape.

# Relations

- [Ctf Asset](ctf-asset.md) — Renders the person's associated image via ctf-asset {kind: sync}
