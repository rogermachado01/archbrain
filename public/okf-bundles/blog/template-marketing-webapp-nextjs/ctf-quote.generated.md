---
type: React Component
title: Ctf Quote.Generated
description: `ctf-quote.generated` is a generated GraphQL artifact supporting the Quote component in this Next.js marketing template. It doesn't define new fields itself but pulls together fragment types and documents from two related generated modules, wiring the Quote component into the broader content-rendering pipeline used across the site.
level: component
owner: contentful/team-workflows
---

`ctf-quote.generated` is a generated GraphQL artifact supporting the Quote component in this Next.js marketing template. It doesn't define new fields itself but pulls together fragment types and documents from two related generated modules, wiring the Quote component into the broader content-rendering pipeline used across the site.

It draws on the shared component map module to access the `ComponentReferenceFields_ComponentQuote_Fragment` type alongside the full set of sibling component reference fragments (CTA, Duplex, HeroBanner, InfoBlock, ProductTable, TextBlock, footer and navigation menus, SEO, and topic-related fragments), plus the `ComponentReferenceFieldsFragmentDoc` used to execute the underlying query. It also imports `AssetFieldsFragment` and its corresponding `AssetFieldsFragmentDoc` from the asset fragment module, so that any image or media asset associated with a quote can be resolved consistently with how assets are handled elsewhere in the app.

Together, these imports let the Quote component type-check and query its data as part of a polymorphic content model, where a page section can be any one of several component types, and where quotes may include an associated asset such as an avatar or logo.

# Relations

- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Supplies the Quote fragment type as part of the shared component reference union {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Resolves any asset (e.g. avatar/logo) attached to the quote {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Provides the query document for fetching polymorphic component reference data {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Provides the query document for fetching the quote's associated asset fields {kind: sync}
