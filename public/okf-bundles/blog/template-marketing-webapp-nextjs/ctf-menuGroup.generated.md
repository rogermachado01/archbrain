---
type: React Component
title: Ctf MenuGroup.Generated
description: `ctf-menuGroup.generated` is a generated React component belonging to the marketing web app template built with Next.js. As a generated artifact, it is produced from a schema or query definition rather than hand-authored, and it forms part of the site's navigation/menu feature set, working alongside related generated modules to render structured content from the CMS.
level: component
owner: contentful/team-workflows
---

`ctf-menuGroup.generated` is a generated React component belonging to the marketing web app template built with Next.js. As a generated artifact, it is produced from a schema or query definition rather than hand-authored, and it forms part of the site's navigation/menu feature set, working alongside related generated modules to render structured content from the CMS.

This component depends on the page-link feature module, pulling in the `PageLinkFieldsFragment` type and its corresponding `PageLinkFieldsFragmentDoc` GraphQL document. This suggests that a menu group is composed of individual page links, and it relies on the page-link module to know how to fetch and type the data needed for each link within the group.

# Relations

- [Page Link.Generated](page-link.generated.md) — Uses page-link data to render each link within the menu group {kind: sync}
