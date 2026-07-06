---
type: React Component
title: Page Link
description: PageLink is a React component that renders a link whose content and destination are derived from CMS-provided page-link data. It relies on a generated GraphQL fragment type, PageLinkFieldsFragment, to type the shape of the page-link fields it receives, ensuring the component's props stay in sync with the underlying schema.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Linking & Navigation
ddd_role: Presentational Component
---

PageLink is a React component that renders a link whose content and destination are derived from CMS-provided page-link data. It relies on a generated GraphQL fragment type, PageLinkFieldsFragment, to type the shape of the page-link fields it receives, ensuring the component's props stay in sync with the underlying schema.

To actually render the clickable element, PageLink delegates to the shared Link component, passing along the appropriate LinkProps. This composition allows PageLink to focus on interpreting page-link-specific data while reusing the shared link behavior—such as navigation handling and styling—that Link already provides.

# Relations

- [Page Link.Generated](page-link.generated.md) — Types its props using the generated page-link fragment {kind: sync}
- [Link](link.md) — Renders the actual anchor via the shared Link component {kind: sync}
