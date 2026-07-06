---
type: React Component
title: Ctf Cta
description: `ctf-cta` is a React component that renders a call-to-action block within the marketing web app template, most likely sourced from Contentful entries typed for CTAs. It relies on a generated fragment type, `CtaFieldsFragment`, to type the shape of the CTA data it receives, keeping the component's props aligned with the underlying GraphQL schema.
level: component
owner: contentful/team-workflows
---

`ctf-cta` is a React component that renders a call-to-action block within the marketing web app template, most likely sourced from Contentful entries typed for CTAs. It relies on a generated fragment type, `CtaFieldsFragment`, to type the shape of the CTA data it receives, keeping the component's props aligned with the underlying GraphQL schema.

To display any accompanying descriptive or supporting text, the component delegates rendering to `CtfRichtext`, which handles Contentful rich text fields consistently across the app. The component also draws on the shared theme utilities, using `getColorConfigFromPalette` to resolve color styling based on a palette value, allowing the CTA's visual appearance to adapt to editorial or design choices without hardcoding colors.

Together these relations show `ctf-cta` acting as a composed presentational unit: it consumes typed content data, renders rich text via a shared component, and styles itself using the app's central theme configuration.

# Relations

- [Ctf Cta.Generated](ctf-cta.generated.md) — Types the CTA's Contentful field data {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the CTA's rich text content {kind: sync}
- [Theme](theme.md) — Resolves the CTA's color styling from the theme palette {kind: sync}
