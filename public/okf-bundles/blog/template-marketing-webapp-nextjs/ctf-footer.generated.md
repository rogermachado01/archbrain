---
type: React Component
title: Ctf Footer.Generated
description: `ctf-footer.generated` is a generated React component file supporting the site footer within this Next.js marketing template. It doesn't define original logic itself but pulls in typed GraphQL fragment definitions needed to render footer content correctly, sourcing structured data for menu groupings and page links.
level: component
owner: contentful/team-workflows
---

`ctf-footer.generated` is a generated React component file supporting the site footer within this Next.js marketing template. It doesn't define original logic itself but pulls in typed GraphQL fragment definitions needed to render footer content correctly, sourcing structured data for menu groupings and page links.

Specifically, it depends on the `ctf-menuGroup.generated` module for both the `MenuGroupFieldsFragment` type and its corresponding `MenuGroupFieldsFragmentDoc` document, which together describe and validate the shape of menu group data (such as footer link columns) used in the footer. It also depends on the `page-link.generated` module for the `PageLinkFieldsFragment` type and `PageLinkFieldsFragmentDoc` document, which describe individual page link entries that appear within those menu groups. Together, these imports let the footer component consume Contentful-sourced content in a type-safe, query-consistent way.

# Relations

- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Provides menu group data structure for footer navigation columns {kind: sync}
- [Page Link.Generated](page-link.generated.md) — Provides page link data structure for individual footer links {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Supplies the GraphQL document for fetching footer menu groups {kind: sync}
- [Page Link.Generated](page-link.generated.md) — Supplies the GraphQL document for fetching footer page links {kind: sync}
