---
type: React Component
title: Page Link
description: PageLink is a React component that renders a link derived from CMS-driven page data. It relies on a generated fragment type, PageLinkFieldsFragment, to know the shape of the page link fields it receives, such as the target page's slug or route information coming from the content model.
level: component
owner: contentful/team-workflows
---

PageLink is a React component that renders a link derived from CMS-driven page data. It relies on a generated fragment type, PageLinkFieldsFragment, to know the shape of the page link fields it receives, such as the target page's slug or route information coming from the content model.

To actually render the anchor element, PageLink composes the shared Link component, passing through its LinkProps so that navigation behaves consistently with other links across the marketing site. In effect, PageLink acts as a thin adapter layer that translates typed CMS page-link data into a properly configured Link instance.

# Relations

- [Page Link.Generated](page-link.generated.md) — Types incoming page link data using the generated fragment {kind: sync}
- [Link](link.md) — Renders the actual anchor via the shared Link component {kind: sync}
