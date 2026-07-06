---
type: React Component
title: Ctf Footer Gql
description: ctf-footer-gql is a React component that acts as the GraphQL-connected wrapper for the site footer. Rather than rendering markup itself, its job is to fetch the footer content from Contentful and hand the resulting data off to the presentational component that actually draws the footer UI.
level: component
owner: contentful/team-workflows
---

ctf-footer-gql is a React component that acts as the GraphQL-connected wrapper for the site footer. Rather than rendering markup itself, its job is to fetch the footer content from Contentful and hand the resulting data off to the presentational component that actually draws the footer UI.

To do this, it relies on a generated query hook, useCtfFooterQuery, which encapsulates the GraphQL query and its typed response for the footer content model. It also reads from the shared Contentful context to obtain request-time details—such as locale, preview mode, or environment settings—needed to execute that query correctly. Once the query resolves, ctf-footer-gql passes the fetched data into CtfFooter, the component responsible for rendering the footer's visual structure.

In effect, this concept sits between the app's Contentful integration layer and the footer's presentation layer, keeping data-fetching concerns separate from rendering concerns.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Fetches footer content via the generated query hook {kind: sync}
- [Ctf Footer](ctf-footer.md) — Passes fetched footer data to the footer presentation component {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful request context to configure the query {kind: sync}
