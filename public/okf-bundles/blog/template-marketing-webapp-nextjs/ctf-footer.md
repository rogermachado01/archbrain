---
type: React Component
title: Ctf Footer
description: ctf-footer is a React component that renders the marketing site's footer section. It relies on a generated GraphQL fragment type, FooterFieldsFragment, to type the Contentful-sourced footer data it receives as props, keeping the component's data shape in sync with the content model defined in Contentful.
level: component
owner: contentful/team-workflows
---

ctf-footer is a React component that renders the marketing site's footer section. It relies on a generated GraphQL fragment type, FooterFieldsFragment, to type the Contentful-sourced footer data it receives as props, keeping the component's data shape in sync with the content model defined in Contentful.

To build out its markup, the component uses the shared Link component for navigation elements within the footer, such as links to other pages or external resources. It also consumes the useContentfulContext hook, which likely provides contextual information such as locale or preview state needed to correctly render Contentful-driven content. Finally, it references CONTAINER_WIDTH from the shared theme module to align its layout width with the rest of the site's design system, ensuring visual consistency across pages.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Types footer data using the generated Contentful fragment {kind: sync}
- [Link](link.md) — Renders navigational links within the footer {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful context for locale/preview-aware rendering {kind: sync}
- [Theme](theme.md) — Aligns footer layout width with the shared theme {kind: sync}
