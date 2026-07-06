---
type: React Component
title: Ctf Footer.Generated
description: `ctf-footer.generated` is a generated React component module belonging to the Next.js marketing web app template. It represents the footer section of the site and is composed from generated GraphQL fragment definitions rather than defining its own data shape from scratch, which is typical of the codegen-based pattern used throughout this template's Contentful-backed components.
level: component
owner: contentful/team-workflows
---

`ctf-footer.generated` is a generated React component module belonging to the Next.js marketing web app template. It represents the footer section of the site and is composed from generated GraphQL fragment definitions rather than defining its own data shape from scratch, which is typical of the codegen-based pattern used throughout this template's Contentful-backed components.

To assemble its content, the module draws on two related generated fragments. It relies on `MenuGroupFieldsFragment` and its accompanying document, `MenuGroupFieldsFragmentDoc`, to represent grouped navigation links, and on `PageLinkFieldsFragment` and `PageLinkFieldsFragmentDoc` to represent individual page links. Together these imports allow the footer to render structured navigation content, such as grouped link sections and individual links to other pages, based on data fetched according to these fragments' shapes.

# Relations

- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Renders grouped navigation links in the footer {kind: sync}
- [Page Link.Generated](page-link.generated.md) — Renders individual page links in the footer {kind: sync}
