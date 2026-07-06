---
type: React Component
title: Ctf Richtext.Generated
description: `ctf-richtext.generated` is a generated React component within the marketing web app template, part of the module responsible for rendering rich text content sourced from Contentful. As a generated artifact, its structure and type usage are derived from the underlying GraphQL schema rather than hand-authored, keeping it in sync with the content model it supports.
level: component
owner: contentful/team-workflows
---

`ctf-richtext.generated` is a generated React component within the marketing web app template, part of the module responsible for rendering rich text content sourced from Contentful. As a generated artifact, its structure and type usage are derived from the underlying GraphQL schema rather than hand-authored, keeping it in sync with the content model it supports.

This component depends on the page-link module, pulling in `PageLinkFieldsFragment` and `PageLinkFieldsFragmentDoc` from its generated file. This suggests that rich text fields can embed or reference internal page links, and this component relies on that fragment's typing and query document to properly resolve and render those embedded link references as part of the rich text output.

# Relations

- [Page Link.Generated](page-link.generated.md) — Resolves embedded page links within rich text content {kind: sync}
