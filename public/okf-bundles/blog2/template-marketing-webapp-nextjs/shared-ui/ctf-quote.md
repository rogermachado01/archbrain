---
type: React Component
title: Ctf Quote
description: CtfQuote renders a Contentful-driven quote block within the marketing site's component tree, displaying rich text content alongside styling drawn from the shared theme palette. It participates in the generated Contentful component map as one of the recognized component reference types, allowing pages to embed quotes wherever the CMS content model resolves a component reference to a quote entry.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

Beyond composing rich text and theme-based coloring, this component pulls in asset field data, suggesting the quote can be accompanied by an image or media asset (such as an avatar or logo tied to the quote's source). This ties the component into the broader asset-handling pipeline shared across other Ctf components, keeping media rendering consistent site-wide.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders the quote's body text {kind: sync}
- [Theme](theme.md) — Applies theme colors to the quote block {kind: sync}
- [Ctf ComponentMap.Generated](ctf-componentMap.generated.md) — Registered as a selectable component reference type {kind: sync}
- [Ctf Asset](ctf-asset.md) — Supplies asset data for quote-attached media {kind: sync}
