---
type: React Component
title: Ctf Quote.Generated
description: This is a generated GraphQL artifact for the ctf-quote component, providing the generated type and fragment definitions that back the Quote component's data layer within the Next.js marketing template. As a generated file, it centralizes the typed contracts derived from the underlying GraphQL schema so the Quote component can safely consume its content fields.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Quote Content
ddd_role: Generated Type/Fragment
---

This is a generated GraphQL artifact for the ctf-quote component, providing the generated type and fragment definitions that back the Quote component's data layer within the Next.js marketing template. As a generated file, it centralizes the typed contracts derived from the underlying GraphQL schema so the Quote component can safely consume its content fields.

It draws on the shared component map fragment document, which aggregates reference fields across the many possible component types (CTA, Duplex, HeroBanner, InfoBlock, ProductTable, Quote, TextBlock, footer/navigation menus, pages, SEO, and topic types) that can appear as referenced content in the CMS-driven page structure. It also depends on the asset fields fragment, which supplies typed asset field definitions—likely used for any image or media content associated with a quote entry, such as an avatar or illustrative asset.

# Relations

- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Resolves component reference fields for the quote entry {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Resolves asset fields used within the quote {kind: sync}
