---
type: React Component
title: Ctf ComponentMap.Generated
description: `ctf-componentMap.generated` is a generated mapping file in the shared-ui layer that associates Contentful content type IDs with their corresponding React components, enabling the app to resolve which component should render a given block of Contentful-authored content.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Contentful Platform Infrastructure
ddd_role: Generated Config Component
---

Being a generated artifact, it is maintained programmatically rather than hand-edited, keeping the mapping in sync as content types and their component counterparts evolve. Other parts of the marketing webapp rely on this map as the lookup table that ties Contentful data models to the React components responsible for displaying them, forming a key link in the pipeline from CMS content to rendered UI.
