---
type: React Component
title: Ctf Navigation.Generated
description: This is a generated file within the `ctf-navigation` module, part of the Next.js marketing web app template's data layer. As a generated artifact, it depends on fragment definitions produced elsewhere in the codebase rather than defining its own logic directly, reflecting the typical pattern of GraphQL code generation tools that emit typed fragment references alongside consuming components.
level: component
owner: contentful/team-workflows
---

This is a generated file within the `ctf-navigation` module, part of the Next.js marketing web app template's data layer. As a generated artifact, it depends on fragment definitions produced elsewhere in the codebase rather than defining its own logic directly, reflecting the typical pattern of GraphQL code generation tools that emit typed fragment references alongside consuming components.

The module draws on two shared fragment definitions to assemble the data shape it needs. It imports page link fields from a page-link fragment module, suggesting that navigation entries resolve to internal or external page destinations. It also imports menu group fields from a shared fragments library, indicating that navigation content is organized into grouped menu structures reused across the broader application rather than defined locally.

# Relations

- [Page Link.Generated](page-link.generated.md) — Resolves navigation links to their target pages {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Groups navigation items into menus {kind: sync}
