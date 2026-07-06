---
type: React Component
title: Ctf Richtext.Generated
description: `ctf-richtext.generated` is a generated React component within the marketing web app template, associated with rendering rich text content (as indicated by its "ctf" naming convention, suggesting a Contentful integration). As a generated artifact, it is produced by a code generation process rather than authored directly, likely from a GraphQL schema or fragment definition tied to rich text fields.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Richtext Rendering
ddd_role: Generated Type/Fragment
---

`ctf-richtext.generated` is a generated React component within the marketing web app template, associated with rendering rich text content (as indicated by its "ctf" naming convention, suggesting a Contentful integration). As a generated artifact, it is produced by a code generation process rather than authored directly, likely from a GraphQL schema or fragment definition tied to rich text fields.

This component depends on the page-link module, pulling in the `PageLinkFieldsFragment` type and its corresponding `PageLinkFieldsFragmentDoc` GraphQL document. This suggests that rich text content rendered by this component can embed or reference internal page links, requiring the shape and query definition of link fields to properly resolve and render those embedded links within the rich text body.

# Relations

- [Page Link.Generated](page-link.generated.md) — Resolves embedded page links within rendered rich text {kind: sync}
