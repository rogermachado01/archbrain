---
type: React Component
title: Ctf Video
description: ctf-video is a React component rendered on the homepage and generic content-slug pages ("/" and "/[slug]"), where it's responsible for displaying video content within the marketing site's page layouts.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Contentful Media
ddd_role: Presentational Component
---

It relies on ctf-asset, pulling in the AssetFieldsFragment type from that component's generated GraphQL artifacts, indicating that video content is modeled through the shared asset field structure rather than a separate video-specific data shape.

# Relations

- [Ctf Asset](ctf-asset.md) — Uses asset field data to resolve video source details {kind: sync}
