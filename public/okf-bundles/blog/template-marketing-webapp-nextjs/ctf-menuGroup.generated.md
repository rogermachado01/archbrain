---
type: React Component
title: Ctf MenuGroup.Generated
description: ctf-menuGroup.generated is a generated React component belonging to the marketing web app template built on Next.js. As a generated artifact, it is produced by a code generation step (likely tied to GraphQL fragments) rather than authored directly, which suggests it renders a menu group structure composed of individual page links within the site's content model.
level: component
owner: contentful/team-workflows
---

ctf-menuGroup.generated is a generated React component belonging to the marketing web app template built on Next.js. As a generated artifact, it is produced by a code generation step (likely tied to GraphQL fragments) rather than authored directly, which suggests it renders a menu group structure composed of individual page links within the site's content model.

This component draws on the page-link feature, pulling in the PageLinkFieldsFragment and its corresponding document object from that module. This indicates that a menu group is made up of one or more page links, and the component relies on the shared page-link data shape to know what fields are available when rendering each link within the group.

# Relations

- [Page Link.Generated](page-link.generated.md) — Uses page-link fragment data to render each link in the menu group {kind: sync}
