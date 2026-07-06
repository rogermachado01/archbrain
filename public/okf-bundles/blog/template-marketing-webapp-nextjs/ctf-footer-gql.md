---
type: React Component
title: Ctf Footer Gql
description: CtfFooterGql is a React component that acts as the GraphQL-connected wrapper for the site footer. Rather than rendering markup itself, it is responsible for fetching the footer data needed by the presentational CtfFooter component and passing that data along, keeping data-fetching concerns separate from layout and display concerns.
level: component
owner: contentful/team-workflows
---

CtfFooterGql is a React component that acts as the GraphQL-connected wrapper for the site footer. Rather than rendering markup itself, it is responsible for fetching the footer data needed by the presentational CtfFooter component and passing that data along, keeping data-fetching concerns separate from layout and display concerns.

To retrieve its data, CtfFooterGql relies on a generated query hook produced from the underlying GraphQL query definition, which handles the actual request to Contentful. It also consults the shared Contentful context to obtain contextual information—such as locale or preview settings—needed to issue that query correctly. Once the data is available, CtfFooterGql delegates the actual rendering of the footer UI to the CtfFooter component, supplying it with the fetched content.

# Relations

- [Ctf Footer.Generated](ctf-footer.generated.md) — Fetches footer content via the generated query hook {kind: sync}
- [Ctf Footer](ctf-footer.md) — Passes fetched footer data to the presentational footer {kind: sync}
- [Contentful Context](contentful-context.md) — Reads locale/preview context to scope the footer query {kind: sync}
