---
type: React Component
title: Ctf Person
description: ctf-person is a React component in the Next.js marketing web app template's Contentful content-blocks layer, responsible for rendering a person entry — likely used for author bios, team member listings, or testimonial attributions wherever the CMS content model calls for displaying an individual.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Cards
ddd_role: Presentational Component
---

To render any associated imagery for the person (such as an avatar or profile photo), the component relies on the AssetFieldsFragment and its generated document from the ctf-asset module, pulling in the shared media-handling logic rather than duplicating asset-rendering code.

# Relations

- [Ctf Asset](../contentful-media/ctf-asset.md) — Uses the shared asset fragment to render the person's photo {kind: sync}
