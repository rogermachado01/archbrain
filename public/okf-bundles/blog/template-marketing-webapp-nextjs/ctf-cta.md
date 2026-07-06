---
type: React Component
title: Ctf Cta
description: `ctf-cta` is a React component that renders a call-to-action block sourced from Contentful, part of the marketing webapp template's suite of `ctf-*` feature components. It relies on a generated GraphQL fragment, `CtaFieldsFragment`, to type and shape the CTA content it receives from the CMS, keeping the component's data contract in sync with the underlying Contentful model.
level: component
owner: contentful/team-workflows
---

`ctf-cta` is a React component that renders a call-to-action block sourced from Contentful, part of the marketing webapp template's suite of `ctf-*` feature components. It relies on a generated GraphQL fragment, `CtaFieldsFragment`, to type and shape the CTA content it receives from the CMS, keeping the component's data contract in sync with the underlying Contentful model.

To display any accompanying descriptive or supporting copy, the component delegates to `CtfRichtext`, which handles rendering of rich text content passed in as part of the CTA fields. For visual styling, `ctf-cta` uses `getColorConfigFromPalette` from the shared theme module to resolve color configuration based on a palette value, allowing the CTA's appearance to adapt to different color schemes defined in the design system.

# Relations

- [Ctf Cta.Generated](ctf-cta.generated.md) — Types the CTA's Contentful fields via the generated fragment {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders rich text content within the CTA {kind: sync}
- [Theme](theme.md) — Resolves the CTA's color styling from the theme palette {kind: sync}
