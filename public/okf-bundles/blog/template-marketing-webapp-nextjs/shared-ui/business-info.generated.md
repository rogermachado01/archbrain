---
type: React Component
title: Business Info.Generated
description: This is a generated GraphQL types module supporting the business-info shared UI component, providing the TypeScript typings that back queries returning Topic Business Info data as part of the broader component reference union used across the marketing site's content-driven pages.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Business Info & Settings
ddd_role: Generated Data Component
---

It depends on the ctf-asset generated types to type any asset fields (such as logos or images) associated with the business info entry, and it pulls in the shared componentMap generated types so that Topic Business Info fragments interoperate correctly with the polymorphic component reference structure used when Contentful pages resolve mixed content blocks.

# Relations

- [Ctf Asset](ctf-asset.md) — Types asset fields attached to the business info entry {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Shares component reference fragment types for polymorphic content resolution {kind: sync}
