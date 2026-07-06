---
type: React Component
title: Ctf Footer.Generated
description: `ctf-footer.generated` is a generated React Component module that renders the marketing site's footer. It draws on GraphQL fragment definitions rather than defining data shapes itself, relying on generated fragment types and documents imported from elsewhere in the shared codebase to describe the content it displays.
level: component
owner: contentful/team-workflows
---

`ctf-footer.generated` is a generated React Component module that renders the marketing site's footer. It draws on GraphQL fragment definitions rather than defining data shapes itself, relying on generated fragment types and documents imported from elsewhere in the shared codebase to describe the content it displays.

Specifically, it imports `MenuGroupFieldsFragment` and its companion document from the `ctf-menuGroup` generated fragment module, which supplies the structure for grouped menu links typically shown in a footer's columns. It also imports `PageLinkFieldsFragment` and its document from the `page-link` generated fragment module, providing the shape for individual page links referenced within those menu groups. Together these imports let the footer component request and type-check the nested data it needs to render navigational content.

# Relations

- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Renders footer menu groups using shared menu-group fragment data {kind: sync}
- [Page Link.Generated](page-link.generated.md) — Renders individual footer links using shared page-link fragment data {kind: sync}
