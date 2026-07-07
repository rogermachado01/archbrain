---
type: React Component
icon: fe-component.svg
title: Ctf MenuGroup.Generated
description: ctf-menuGroup.generated is a generated React component in the shared UI layer, rendered on both the homepage (/) and dynamic content pages (/[slug]), where it presumably forms part of the site's navigation structure.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_role: Generated Data Component
---

To render its links, it relies on generated GraphQL artifacts from the page-link feature, pulling in PageLinkFieldsFragment and its corresponding document (PageLinkFieldsFragmentDoc) so that menu entries can be resolved and displayed consistently with how individual page links are rendered elsewhere in the app.

# Relations

- [Page Link](page-link.md) — Uses page-link fragments to render each menu entry's link {kind: sync}
