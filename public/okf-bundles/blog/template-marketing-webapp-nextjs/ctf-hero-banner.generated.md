---
type: React Component
title: Ctf Hero Banner.Generated
description: `ctf-hero-banner.generated` is a generated GraphQL artifact supporting the Hero Banner React component in the Next.js marketing template. Rather than defining component markup or logic directly, it declares the generated fragment dependencies the Hero Banner needs to request and type its Contentful data, namely the page link and asset fragments used elsewhere in the template.
level: component
owner: contentful/team-workflows
---

`ctf-hero-banner.generated` is a generated GraphQL artifact supporting the Hero Banner React component in the Next.js marketing template. Rather than defining component markup or logic directly, it declares the generated fragment dependencies the Hero Banner needs to request and type its Contentful data, namely the page link and asset fragments used elsewhere in the template.

This file pulls in `PageLinkFieldsFragment` and its companion document `PageLinkFieldsFragmentDoc` from the page-link module, which supplies the shape and query document for links used inside the hero banner, such as a call-to-action button pointing to another page. It also imports `AssetFieldsFragment` and `AssetFieldsFragmentDoc` from the `ctf-asset` module, giving the hero banner access to typed image or media asset data, such as a background or featured image. Together these imports let the Hero Banner component compose its own GraphQL query from smaller, reusable fragments rather than redefining field selections.

In the broader architecture, this generated file acts as a thin composition point: it does not introduce new fields itself but wires the Hero Banner's data requirements to the shared page-link and asset fragment definitions, ensuring consistent typing and query structure across components that reference pages or media assets.

# Relations

- [Page Link.Generated](page-link.generated.md) — Supplies the link fragment type for hero CTA links {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Provides the GraphQL document for hero CTA links {kind: sync}
- [Page Link.Generated](page-link.generated.md) — Supplies the asset fragment type for hero images {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Provides the GraphQL document for hero images {kind: sync}
