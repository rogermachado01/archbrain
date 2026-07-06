---
type: React Component
title: Ctf Cta
description: `ctf-cta` is a React component that renders a call-to-action block for the Contentful-driven marketing site template. It relies on generated GraphQL types from its companion `.generated` module to type the CTA fields it receives, such as headline or link data, ensuring the component's props align with the shape returned by the CMS query.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: CTA Content
ddd_role: Presentational Component
---

`ctf-cta` is a React component that renders a call-to-action block for the Contentful-driven marketing site template. It relies on generated GraphQL types from its companion `.generated` module to type the CTA fields it receives, such as headline or link data, ensuring the component's props align with the shape returned by the CMS query.

To display any rich text content associated with the CTA, the component delegates rendering to `ctf-richtext`, which handles the structured Contentful rich text format. For visual styling, `ctf-cta` uses the `getColorConfigFromPalette` helper from the theme module to resolve the appropriate color configuration based on a selected palette, allowing the CTA's appearance to adapt to different theme or design variants defined by the CMS content.

# Relations

- [Ctf Cta.Generated](ctf-cta.generated.md) — Uses generated types to shape incoming CTA data {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within the CTA {kind: sync}
- [Theme](theme.md) — Resolves color styling from the theme palette {kind: sync}
