---
type: React Component
title: Ctf MenuGroup.Generated
description: `ctf-menuGroup.generated` is a generated React component belonging to the marketing web app's Contentful (ctf) integration layer, representing a menu group structure sourced from Contentful content models. As a generated artifact, it is tied closely to GraphQL fragments that define the shape of the data it consumes, rather than containing hand-written logic of its own.
level: component
owner: contentful/team-workflows
---

`ctf-menuGroup.generated` is a generated React component belonging to the marketing web app's Contentful (ctf) integration layer, representing a menu group structure sourced from Contentful content models. As a generated artifact, it is tied closely to GraphQL fragments that define the shape of the data it consumes, rather than containing hand-written logic of its own.

In particular, this component depends on the generated output for the page-link feature, pulling in both the fragment type definition and the corresponding document used to execute or compose GraphQL queries. This suggests that a menu group is composed of one or more page links, with each link's fields validated and typed according to the shared `page-link.generated` module. This allows the menu group component to render navigational entries consistently with however page links are defined elsewhere in the app.

# Relations

- [Page Link.Generated](page-link.generated.md) — Uses page link field types for menu items {kind: sync}
- [Page Link.Generated](page-link.generated.md) — Uses page link query fragment to fetch menu item data {kind: sync}
