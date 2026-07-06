---
type: React Component
title: Ctf Footer.Generated
description: `ctf-footer.generated` is a generated React component module belonging to the Next.js marketing web app template. It represents the footer section of a page and is built up from generated GraphQL fragment types, reflecting the shape of footer content as modeled in Contentful.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Footer Content
ddd_role: Generated Type/Fragment
---

`ctf-footer.generated` is a generated React component module belonging to the Next.js marketing web app template. It represents the footer section of a page and is built up from generated GraphQL fragment types, reflecting the shape of footer content as modeled in Contentful.

To assemble the footer, the module draws on two related generated fragments: one describing menu groups, used to render collections of links organized under a heading, and one describing individual page links, used to render single navigational links. Together these give the footer component the typed data it needs to display the site's footer navigation structure consistently across the app.

# Relations

- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Renders grouped navigation menus in the footer {kind: sync}
- [Page Link.Generated](page-link.generated.md) — Renders individual page links in the footer {kind: sync}
