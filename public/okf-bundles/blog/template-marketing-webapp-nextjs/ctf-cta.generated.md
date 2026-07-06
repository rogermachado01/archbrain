---
type: React Component
title: Ctf Cta.Generated
description: This is a generated React component representing a call-to-action (CTA) block, identified as `ctf-cta.generated` within the marketing web app template. As a generated file, it is produced from an underlying schema or content type definition rather than authored directly, which is typical for components that map to structured content sources.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: CTA Content
ddd_role: Generated Type/Fragment
---

This is a generated React component representing a call-to-action (CTA) block, identified as `ctf-cta.generated` within the marketing web app template. As a generated file, it is produced from an underlying schema or content type definition rather than authored directly, which is typical for components that map to structured content sources.

The component depends on the page-link module, pulling in `PageLinkFieldsFragment` and `PageLinkFieldsFragmentDoc` from its generated GraphQL fragment definitions. This suggests the CTA component uses page-link data—such as fragment types and query documents—to resolve or type the destination link that the call-to-action points to, connecting the CTA's actionable element to a page within the site.

# Relations

- [Page Link.Generated](page-link.generated.md) — Resolves the CTA's target link using page-link fragment data {kind: sync}
