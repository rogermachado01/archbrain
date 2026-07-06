---
type: React Component
title: Ctf MenuGroup.Generated
description: `ctf-menuGroup.generated` is a generated React component belonging to the marketing web app template built with Next.js. As a generated artifact, it is derived from a schema or codegen process rather than hand-authored, and it fits into the broader "features" component structure alongside related generated components.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation Content
ddd_role: Generated Type/Fragment
---

`ctf-menuGroup.generated` is a generated React component belonging to the marketing web app template built with Next.js. As a generated artifact, it is derived from a schema or codegen process rather than hand-authored, and it fits into the broader "features" component structure alongside related generated components.

This component relies on the page-link feature module, pulling in both the fragment definition and its corresponding document object. This suggests that a menu group component composes or renders links to pages as part of its structure, reusing the page-link component's generated GraphQL artifacts to ensure consistent data shape and query composition across the app.

# Relations

- [Page Link.Generated](page-link.generated.md) — Uses page-link fragments to render linked pages within the menu group {kind: sync}
