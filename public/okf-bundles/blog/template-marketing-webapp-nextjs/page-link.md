---
type: React Component
title: Page Link
description: PageLink is a React component that renders a link element based on structured page-link data, likely produced by a CMS or content model. It relies on a generated GraphQL fragment type, PageLinkFieldsFragment, to type the shape of the page-link data it receives, ensuring the component's props align with whatever fields are queried for page links elsewhere in the app.
level: component
owner: contentful/team-workflows
---

PageLink is a React component that renders a link element based on structured page-link data, likely produced by a CMS or content model. It relies on a generated GraphQL fragment type, PageLinkFieldsFragment, to type the shape of the page-link data it receives, ensuring the component's props align with whatever fields are queried for page links elsewhere in the app.

To actually render the link, PageLink delegates to the shared Link component, using its LinkProps type to stay consistent with how links are handled across the marketing webapp template. This suggests PageLink acts as a thin adapter layer: it takes CMS-shaped page-link data and translates it into the props expected by the shared Link component, keeping link-rendering behavior centralized while allowing page-link-specific data to flow in from content queries.

# Relations

- [Page Link.Generated](page-link.generated.md) — Types incoming page-link data using the generated fragment {kind: sync}
- [Link](link.md) — Renders the final link using the shared Link component {kind: sync}
