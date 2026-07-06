---
type: React Component
title: Ctf Footer
description: ctf-footer is a React component that renders the marketing site's footer, built on Contentful-managed content. It relies on a generated GraphQL fragment type, FooterFieldsFragment, to type the footer content it receives from Contentful, ensuring the component's props stay in sync with the underlying content model.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Footer Content
ddd_role: Presentational Component
---

ctf-footer is a React component that renders the marketing site's footer, built on Contentful-managed content. It relies on a generated GraphQL fragment type, FooterFieldsFragment, to type the footer content it receives from Contentful, ensuring the component's props stay in sync with the underlying content model.

To build out its interface, the component uses the shared Link component for internal navigation elements within the footer, and reads from the Contentful context via useContentfulContext, which likely supplies preview/editing state or locale information relevant to how footer content is displayed. It also references CONTAINER_WIDTH from the shared theme module, suggesting the footer's layout is constrained to match the site's standard content width for visual consistency across pages.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Types its footer content props from the generated Contentful fragment {kind: sync}
- [Link](link.md) — Renders navigation links within the footer {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful preview/editing context for footer content {kind: sync}
- [Theme](theme.md) — Aligns footer layout width with the site's shared theme {kind: sync}
