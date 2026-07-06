---
type: React Component
title: Ctf Navigation.Generated
description: `ctf-navigation.generated` is a generated React component belonging to the marketing web app template, associated with the navigation feature of the site. It is not hand-authored code but the output of a GraphQL codegen process, meaning its structure is driven by an underlying GraphQL document that queries the fields needed to render navigation.
level: component
owner: contentful/team-workflows
---

`ctf-navigation.generated` is a generated React component belonging to the marketing web app template, associated with the navigation feature of the site. It is not hand-authored code but the output of a GraphQL codegen process, meaning its structure is driven by an underlying GraphQL document that queries the fields needed to render navigation.

This component depends on two generated fragment modules to assemble its data shape. It imports `PageLinkFieldsFragment` and its companion `PageLinkFieldsFragmentDoc` from the page-link fragment module, which supplies the typed fields and executable document needed to render individual navigation links. It also imports `MenuGroupFieldsFragment` and `MenuGroupFieldsFragmentDoc` from a shared fragments library used across the app, which supplies the typed fields and document for grouping related links into menu sections. Together these imports let the navigation component compose both individual links and grouped menu structures into the final rendered navigation UI.

# Relations

- [Page Link.Generated](page-link.generated.md) — Uses page link field types to render individual nav links {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Uses menu group field types to render grouped nav sections {kind: sync}
- [Page Link.Generated](page-link.generated.md) — Includes the page link query document for fetching link data {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Includes the menu group query document for fetching grouped menu data {kind: sync}
