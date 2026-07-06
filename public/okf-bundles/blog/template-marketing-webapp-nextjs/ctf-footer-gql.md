---
type: React Component
title: Ctf Footer Gql
description: ctf-footer-gql is a React component responsible for fetching and preparing the data needed to render the site footer. It calls the generated useCtfFooterQuery hook to retrieve footer content from Contentful, and it consults the Contentful context to determine the current locale and preview state that should be applied to that query. Once the data is available, ctf-footer-gql passes it along to the CtfFooter component, which is responsible for the actual presentation of the footer.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Footer Content
ddd_role: Data Fetching Component
---

ctf-footer-gql is a React component responsible for fetching and preparing the data needed to render the site footer. It calls the generated useCtfFooterQuery hook to retrieve footer content from Contentful, and it consults the Contentful context to determine the current locale and preview state that should be applied to that query. Once the data is available, ctf-footer-gql passes it along to the CtfFooter component, which is responsible for the actual presentation of the footer.

In practice, this component acts as the data-fetching layer that sits between the generated GraphQL query and the presentational footer component. It ensures that the footer always receives correctly scoped, up-to-date content by combining the query results with contextual settings from the surrounding Contentful environment.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Fetches footer content via the generated query hook {kind: sync}
- [Ctf Footer](ctf-footer.md) — Passes fetched footer data to the presentational footer component {kind: sync}
- [Contentful Context](contentful-context.md) — Reads locale and preview settings from Contentful context {kind: sync}
