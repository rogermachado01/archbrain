---
type: React Component
title: Ctf Navigation.Generated
description: `ctf-navigation.generated` is a generated artifact tied to a React Component in the marketing web app template, part of the Contentful-driven navigation setup. It draws on generated GraphQL fragment types and documents from two related modules to assemble the data shape it needs for rendering navigation content.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation Content
ddd_role: Generated Type/Fragment
---

`ctf-navigation.generated` is a generated artifact tied to a React Component in the marketing web app template, part of the Contentful-driven navigation setup. It draws on generated GraphQL fragment types and documents from two related modules to assemble the data shape it needs for rendering navigation content.

Specifically, it imports `PageLinkFieldsFragment` and its corresponding document from the page-link module, giving it access to the fields needed to represent individual navigation links. It also imports `MenuGroupFieldsFragment` and its document from a shared fragments library, which supplies the structure for grouped sets of menu items. Together these imports let the navigation component compose links and grouped menus into a cohesive navigation structure for the site.

# Relations

- [Page Link.Generated](page-link.generated.md) — Uses page link data to render individual navigation links {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Uses menu group data to render grouped navigation sections {kind: sync}
