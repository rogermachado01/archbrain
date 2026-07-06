---
type: React Component
title: Ctf Footer
description: ctf-footer is a React component that renders the marketing site's footer section, built from Contentful-managed content. It relies on a generated GraphQL fragment type to know the shape of the footer data it receives, ensuring the component stays in sync with the content model defined in Contentful.
level: component
owner: contentful/team-workflows
---

ctf-footer is a React component that renders the marketing site's footer section, built from Contentful-managed content. It relies on a generated GraphQL fragment type to know the shape of the footer data it receives, ensuring the component stays in sync with the content model defined in Contentful.

To build out its layout and behavior, the component uses a shared Link component for navigation elements within the footer, and taps into the Contentful context hook to access contextual data such as locale or preview state needed for rendering content correctly. It also references a shared container width constant from the app's theme to keep the footer's layout consistent with the overall site design.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Uses generated fragment types to type the footer's Contentful data {kind: sync}
- [Link](link.md) — Renders footer navigation links {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful context for locale and preview state {kind: sync}
- [Theme](theme.md) — Aligns footer layout width with the shared theme container {kind: sync}
