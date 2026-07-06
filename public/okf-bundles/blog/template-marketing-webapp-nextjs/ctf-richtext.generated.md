---
type: React Component
title: Ctf Richtext.Generated
description: `ctf-richtext.generated` is a generated React component belonging to the marketing web app's `ctf-richtext` module, following the template's convention of pairing hand-authored components with generated GraphQL artifacts. As part of this generated layer, it draws in fragment definitions and document types from the sibling `page-link` module, indicating that rich text content rendered by this component may include or reference page link fields.
level: component
owner: contentful/team-workflows
---

`ctf-richtext.generated` is a generated React component belonging to the marketing web app's `ctf-richtext` module, following the template's convention of pairing hand-authored components with generated GraphQL artifacts. As part of this generated layer, it draws in fragment definitions and document types from the sibling `page-link` module, indicating that rich text content rendered by this component may include or reference page link fields.

This component sits within the broader Contentful-driven content pipeline (suggested by the `ctf-` prefix), where rich text fields fetched from the CMS are rendered into React markup, and embedded links within that rich text rely on the shared `page-link` fragment to resolve their structure.

# Relations

- [Page Link.Generated](page-link.generated.md) — Reuses page link fields to render embedded links within rich text {kind: sync}
